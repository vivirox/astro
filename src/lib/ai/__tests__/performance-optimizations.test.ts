import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAdvancedOptimizedAIService } from "../performance-optimizations";
import { AIService, AICompletionRequest, AICompletionResponse } from "../types";
import * as performanceTracker from "../performance-tracker";

// Mock the performance tracker
vi.mock("../performance-tracker", () => ({
  trackPerformance: vi.fn(),
}));

describe("Advanced Performance Optimizations", () => {
  let mockService: AIService;
  let completeMock: vi.Mock;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create a mock AI service
    completeMock = vi.fn();
    mockService = {
      complete: completeMock,
      getModelInfo: vi.fn(),
    };

    // Setup default mock response
    completeMock.mockResolvedValue({
      id: "test-id",
      model: "test-model",
      content: "Test response",
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should pass through requests to the underlying service", async () => {
    const optimizedService = createAdvancedOptimizedAIService(mockService);

    const request: AICompletionRequest = {
      model: "test-model",
      messages: [{ role: "user", content: "Hello" }],
    };

    await optimizedService.complete(request);

    expect(completeMock).toHaveBeenCalledWith(request);
  });

  it("should track performance metrics", async () => {
    const optimizedService = createAdvancedOptimizedAIService(mockService);

    const request: AICompletionRequest = {
      model: "test-model",
      messages: [{ role: "user", content: "Hello" }],
      userId: "test-user",
      sessionId: "test-session",
    };

    await optimizedService.complete(request);

    expect(performanceTracker.trackPerformance).toHaveBeenCalledTimes(1);
    expect(performanceTracker.trackPerformance).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        success: true,
        cached: false,
        optimized: false,
        user_id: "test-user",
        session_id: "test-session",
      }),
    );
  });

  it("should cache responses and return cached results", async () => {
    const optimizedService = createAdvancedOptimizedAIService(mockService, {
      enableCache: true,
      cacheTTL: 60, // 1 minute
    });

    const request: AICompletionRequest = {
      model: "test-model",
      messages: [{ role: "user", content: "Hello" }],
    };

    // First request should hit the service
    await optimizedService.complete(request);
    expect(completeMock).toHaveBeenCalledTimes(1);

    // Second identical request should use cache
    await optimizedService.complete(request);
    expect(completeMock).toHaveBeenCalledTimes(1); // Still only called once

    // Different request should hit the service again
    await optimizedService.complete({
      ...request,
      messages: [{ role: "user", content: "Different message" }],
    });
    expect(completeMock).toHaveBeenCalledTimes(2);
  });

  it("should optimize tokens for long conversations", async () => {
    const optimizedService = createAdvancedOptimizedAIService(mockService, {
      enableTokenOptimization: true,
      maxContextLength: 100, // Very low for testing
    });

    // Create a long conversation
    const longRequest: AICompletionRequest = {
      model: "test-model",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content:
            "Message 1 that is quite long and would exceed our token limit if we included all messages.",
        },
        {
          role: "assistant",
          content:
            "Response 1 that is also quite verbose and would contribute to exceeding our token limit.",
        },
        {
          role: "user",
          content:
            "Message 2 with additional context that would definitely push us over the limit.",
        },
        {
          role: "assistant",
          content: "Response 2 continuing the conversation with more tokens.",
        },
        {
          role: "user",
          content: "Final message that should be included since it is recent.",
        },
      ],
    };

    await optimizedService.complete(longRequest);

    // The service should have been called with a subset of messages
    expect(completeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          // Should include the most recent messages but not all
        ]),
      }),
    );

    // The optimized request should have fewer messages than the original
    const calledWith = completeMock.mock.calls[0][0];
    expect(calledWith.messages.length).toBeLessThan(
      longRequest.messages.length,
    );

    // System message should always be included
    expect(calledWith.messages[0].role).toBe("system");

    // Last message should always be included
    const lastMessageIndex = calledWith.messages.length - 1;
    expect(calledWith.messages[lastMessageIndex].content).toBe(
      "Final message that should be included since it is recent.",
    );
  });

  it("should handle rate limiting", async () => {
    const optimizedService = createAdvancedOptimizedAIService(mockService, {
      enableRateLimit: true,
      maxRequestsPerMinute: 2,
    });

    const request: AICompletionRequest = {
      model: "test-model",
      messages: [{ role: "user", content: "Hello" }],
      userId: "rate-limited-user",
    };

    // First request should succeed
    await optimizedService.complete(request);
    expect(completeMock).toHaveBeenCalledTimes(1);

    // Second request should succeed
    await optimizedService.complete(request);
    expect(completeMock).toHaveBeenCalledTimes(2);

    // Third request should be rate limited
    await expect(optimizedService.complete(request)).rejects.toThrow(
      "Rate limit exceeded",
    );
    expect(completeMock).toHaveBeenCalledTimes(2); // Still only called twice

    // Should track the failed request
    expect(performanceTracker.trackPerformance).toHaveBeenCalledTimes(3);
    expect(performanceTracker.trackPerformance).toHaveBeenLastCalledWith(
      expect.objectContaining({
        success: false,
        error_code: "RATE_LIMITED",
      }),
    );
  });

  it("should try fallback models when primary model fails", async () => {
    // Make the primary model fail
    completeMock.mockImplementation((request) => {
      if (request.model === "primary-model") {
        return Promise.reject(new Error("Primary model error"));
      }
      return Promise.resolve({
        id: "fallback-id",
        model: request.model,
        content: "Fallback response",
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      });
    });

    const optimizedService = createAdvancedOptimizedAIService(mockService, {
      enableFallback: true,
      fallbackModels: ["fallback-model-1", "fallback-model-2"],
    });

    const request: AICompletionRequest = {
      model: "primary-model",
      messages: [{ role: "user", content: "Hello" }],
    };

    const response = await optimizedService.complete(request);

    // Should have tried the fallback model
    expect(completeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "fallback-model-1",
      }),
    );

    // Should return the fallback response
    expect(response.model).toBe("fallback-model-1");
    expect(response.content).toBe("Fallback response");

    // Should track both the failed request and successful fallback
    expect(performanceTracker.trackPerformance).toHaveBeenCalledTimes(2);
  });
});
