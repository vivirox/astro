import { type APIRoute } from "astro";
import { getSession } from "../../../lib/auth/session";
import { createAIService } from "../../../lib/ai/services/together";
import { ResponseGenerationService } from "../../../lib/ai/services/response";
import { createAuditLog } from "../../../lib/audit/log";
import { aiRepository } from "../../../lib/db/ai";

/**
 * API route for therapeutic response generation
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify session
    const session = await getSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await request.json();
    const {
      messages,
      currentMessage,
      previousMessages,
      instructions,
      model,
      temperature = 0.5,
      maxResponseTokens = 1024,
    } = body;

    // Validate required fields
    if (!messages && !(currentMessage && previousMessages)) {
      return new Response(
        JSON.stringify({
          error:
            "Either messages or both currentMessage and previousMessages are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create Together AI service
    const togetherService = createAIService({
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL,
    });

    // Use the model from the request or the default
    const modelId = model || "mistralai/Mixtral-8x7B-Instruct-v0.1";

    // Create response generation service
    const responseService = new ResponseGenerationService({
      aiService: togetherService,
      model: modelId,
      temperature,
      maxResponseTokens,
    });

    // Log the request
    await createAuditLog({
      userId: session.user.id,
      action: "ai.response.request",
      resource: "ai",
      metadata: {
        model: modelId,
        temperature,
        maxResponseTokens,
        hasInstructions: !!instructions,
        messageCount: messages
          ? messages.length
          : previousMessages
            ? previousMessages.length + 1
            : 1,
      },
    });

    // Start timer for latency measurement
    const startTime = Date.now();

    // Process the request
    let result;
    if (messages) {
      result = await responseService.generateFromMessages(
        messages,
        instructions,
      );
    } else {
      result = await responseService.generate(
        currentMessage,
        previousMessages,
        instructions,
      );
    }

    const latencyMs = Date.now() - startTime;

    // Store the result in the database
    await aiRepository.storeResponseGeneration({
      userId: session.user.id,
      modelId: modelId,
      modelProvider: "together",
      requestTokens: result.usage?.promptTokens || 0,
      responseTokens: result.usage?.completionTokens || 0,
      totalTokens: result.usage?.totalTokens || 0,
      latencyMs,
      success: true,
      prompt: currentMessage || (messages ? JSON.stringify(messages) : ""),
      response: result.content,
      context: previousMessages ? JSON.stringify(previousMessages) : undefined,
      instructions,
      temperature: temperature,
      maxTokens: maxResponseTokens,
      metadata: {
        messageCount: messages
          ? messages.length
          : previousMessages
            ? previousMessages.length + 1
            : 1,
      },
    });

    // Log the response
    await createAuditLog({
      userId: session.user.id,
      action: "ai.response.generated",
      resource: "ai",
      metadata: {
        model: modelId,
        responseLength: result.content.length,
        latencyMs,
      },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in response generation API:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
