import type {
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIError,
  AIUsageRecord,
} from "../models/ai-types";

/**
 * Fallback Service Configuration
 */
export interface FallbackServiceConfig {
  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds
   * @default 1000
   */
  retryDelay?: number;

  /**
   * Whether to enable fallback responses
   * @default true
   */
  enableFallbackResponses?: boolean;

  /**
   * Whether to enable the fallback service
   * @default true
   */
  enabled?: boolean;
}

/**
 * Fallback Service
 *
 * Provides fallback mechanisms for API failures
 */
export class FallbackService {
  private maxRetries: number;
  private retryDelay: number;
  private enableFallbackResponses: boolean;
  private enabled: boolean;

  constructor(config: FallbackServiceConfig = {}) {
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.enableFallbackResponses = config.enableFallbackResponses !== false;
    this.enabled = config.enabled !== false;
  }

  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      onRetry?: (attempt: number, error: Error) => void;
      shouldRetry?: (error: any) => boolean;
    } = {},
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const { onRetry, shouldRetry = this.defaultShouldRetry } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        if (!shouldRetry(error)) {
          throw error;
        }

        // Notify about retry
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        // Wait before retrying
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error("Operation failed after retries");
  }

  /**
   * Default logic to determine if an error should trigger a retry
   */
  private defaultShouldRetry(error: any): boolean {
    // Retry on network errors or 5xx server errors
    if (error instanceof Error) {
      // Network errors
      if (
        error.message.includes("network") ||
        error.message.includes("connection") ||
        error.message.includes("timeout")
      ) {
        return true;
      }
    }

    // Check for API errors
    if (error && typeof error === "object") {
      // Retry on rate limits or server errors
      if (
        (error as AIError).status >= 500 ||
        (error as AIError).status === 429
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create a promise that resolves after a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a fallback response when all retries fail
   */
  generateFallbackResponse(
    request: AICompletionRequest,
    error: AIError,
  ): AICompletionResponse | null {
    if (!this.enabled || !this.enableFallbackResponses) {
      return null;
    }

    // Extract the last user message
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((msg) => msg.role === "user");

    if (!lastUserMessage) {
      return null;
    }

    // Create a fallback response
    const fallbackContent = this.createFallbackContent(error);

    const usage: AIUsageRecord = {
      provider: "fallback",
      model: request.model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      timestamp: new Date().toISOString(),
    };

    return {
      provider: "fallback",
      model: request.model,
      choices: [
        {
          message: {
            role: "assistant",
            content: fallbackContent,
          },
          finishReason: "fallback",
        },
      ],
      usage,
    };
  }

  /**
   * Create appropriate fallback content based on the error
   */
  private createFallbackContent(error: AIError): string {
    // Different responses based on error type
    if (error.status === 429) {
      return "I'm currently experiencing high demand. Please try again in a moment.";
    }

    if (error.status >= 500) {
      return "I'm having trouble connecting to my services right now. Please try again later.";
    }

    if (error.message.includes("timeout")) {
      return "It's taking longer than expected to process your request. Please try again with a simpler query.";
    }

    // Default fallback message
    return "I'm unable to respond right now. Please try again later.";
  }
}
