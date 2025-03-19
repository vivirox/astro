import type { APIRoute } from "astro";
import { createAIService } from "../../../lib/ai";
import { getSession } from "../../../lib/auth";
import { createAuditLog } from "../../../lib/audit";
import { handleApiError } from "../../../lib/ai/error-handling";
import { validateRequestBody } from "../../../lib/validation";
import { CompletionRequestSchema } from "../../../lib/validation/schemas";

/**
 * API route for AI chat completions
 * Secured by authentication and input validation
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify session
    const session = await getSession(cookies);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Validate request body against schema
    const [data, validationError] = await validateRequestBody(
      request,
      CompletionRequestSchema,
    );

    if (validationError) {
      // Create audit log for validation error
      await createAuditLog({
        action: "ai.completion.validation_error",
        category: "ai",
        status: "error",
        userId: session.user?.id,
        details: {
          error: validationError.error,
          details: validationError.details,
        },
      });

      return new Response(JSON.stringify(validationError), {
        status: validationError.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Check input size to prevent abuse
    const totalInputSize = JSON.stringify(data).length;
    const maxAllowedSize = 1024 * 50; // 50KB limit

    if (totalInputSize > maxAllowedSize) {
      return new Response(
        JSON.stringify({
          error: "Payload too large",
          message: "The request payload exceeds the maximum allowed size",
        }),
        {
          status: 413,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Create AI service
    const aiService = createAIService({
      provider: "together",
    });

    // Create audit log for the request
    await createAuditLog({
      action: "ai.completion.request",
      category: "ai",
      status: "success",
      userId: session.user?.id,
      details: {
        model: data.model,
        messageCount: data.messages.length,
        streaming: data.stream,
        inputSize: totalInputSize,
      },
    });

    // Handle streaming response
    if (data.stream) {
      const { stream: responseStream, model: responseModel } =
        await aiService.createStreamingChatCompletion(data.messages, {
          model: data.model,
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          presence_penalty: data.presence_penalty,
          frequency_penalty: data.frequency_penalty,
          top_p: data.top_p,
        });

      // Create a readable stream that processes chunks from the AI service
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              // Send each chunk as a server-sent event
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ content: chunk.content, model: responseModel })}\n\n`,
                ),
              );
            }
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Error in streaming response:", error);
            controller.error(error);

            // Create audit log for streaming error
            await createAuditLog({
              action: "ai.completion.stream_error",
              category: "ai",
              status: "error",
              userId: session.user?.id,
              details: {
                error: error instanceof Error ? error.message : String(error),
              },
            });
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Handle non-streaming response
    const completion = await aiService.createChatCompletion(data.messages, {
      model: data.model,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      presence_penalty: data.presence_penalty,
      frequency_penalty: data.frequency_penalty,
      top_p: data.top_p,
    });

    // Create audit log for the completion
    await createAuditLog({
      action: "ai.completion.response",
      category: "ai",
      status: "success",
      userId: session.user?.id,
      details: {
        model: completion.model,
        contentLength: completion.content.length,
        tokenUsage: completion.usage,
      },
    });

    return new Response(JSON.stringify(completion), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error in AI completion API:", error);

    // Create audit log for the error
    await createAuditLog({
      action: "ai.completion.error",
      category: "ai",
      status: "error",
      details: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    // Use the standardized error handling
    return handleApiError(error);
  }
};
