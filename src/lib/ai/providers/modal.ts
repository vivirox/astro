import type {
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIStreamChunk,
  AIError,
} from "../models/types";

/**
 * Modal Provider Configuration
 */
export interface ModalProviderConfig {
  apiKey?: string;
  baseUrl: string; // Required for Modal as it points to your deployed endpoint
  defaultModel?: string;
}

/**
 * Modal Provider Implementation
 *
 * This provider integrates with Modal's API for custom model inference
 */
export class ModalProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: ModalProviderConfig = { baseUrl: "" }) {
    this.apiKey = config.apiKey || process.env.MODAL_API_KEY || "";
    this.baseUrl = config.baseUrl || "";
    this.defaultModel = config.defaultModel || "custom-model";

    if (!this.baseUrl) {
      throw new Error("Modal baseUrl is required");
    }
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    messages: AIMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {},
  ): Promise<AICompletionResponse | ReadableStream<AIStreamChunk>> {
    try {
      const model = options.model || this.defaultModel;
      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens;
      const stream = options.stream || false;

      // Format messages for Modal API
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Prepare request payload
      const payload = {
        messages: formattedMessages,
        model,
        temperature,
        ...(maxTokens && { max_tokens: maxTokens }),
        stream,
      };

      // Set up request headers
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      // Make API request
      if (stream) {
        return this.createStreamingResponse(payload, headers);
      } else {
        return this.createStandardResponse(payload, headers);
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a standard (non-streaming) response
   */
  private async createStandardResponse(
    payload: any,
    headers: HeadersInit,
  ): Promise<AICompletionResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Modal API error: ${response.status} ${response.statusText} - ${
          errorData.error?.message || JSON.stringify(errorData)
        }`,
      );
    }

    const data = await response.json();

    // Format response to match our internal format
    return {
      id: data.id || `modal-${Date.now()}`,
      model: data.model || this.defaultModel,
      choices: [
        {
          message: {
            role: data.choices[0]?.message?.role || "assistant",
            content: data.choices[0]?.message?.content || "",
          },
          finishReason: data.choices[0]?.finish_reason || "stop",
        },
      ],
      usage: data.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  /**
   * Create a streaming response
   */
  private createStreamingResponse(
    payload: any,
    headers: HeadersInit,
  ): ReadableStream<AIStreamChunk> {
    return new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              `Modal API error: ${response.status} ${response.statusText} - ${
                errorData.error?.message || JSON.stringify(errorData)
              }`,
            );
          }

          if (!response.body) {
            throw new Error("Response body is null");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const data = JSON.parse(line.slice(6));
                  const chunk: AIStreamChunk = {
                    id: data.id || `modal-${Date.now()}`,
                    model: data.model || "custom-model",
                    choices: [
                      {
                        delta: {
                          role: data.choices[0]?.delta?.role || undefined,
                          content: data.choices[0]?.delta?.content || "",
                        },
                        finishReason: data.choices[0]?.finish_reason || null,
                      },
                    ],
                  };
                  controller.enqueue(chunk);
                } catch (e) {
                  console.error("Error parsing stream data:", e);
                }
              } else if (line === "data: [DONE]") {
                break;
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  }

  /**
   * Handle errors from the Modal API
   */
  private handleError(error: any): AIError {
    console.error("Modal API error:", error);

    return {
      message: error.message || "Unknown error",
      type: "modal_error",
      param: null,
      code: error.status || 500,
    };
  }
}
