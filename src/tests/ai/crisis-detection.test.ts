import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrisisDetectionService } from "../../lib/ai/services/crisis-detection";
import type { AIService } from "../../lib/ai/types";

// Mock AI service
const mockAIService: AIService = {
  createChatCompletion: vi.fn(),
  createStreamingChatCompletion: vi.fn(),
  getModelInfo: vi.fn(),
};

describe("CrisisDetectionService", () => {
  let crisisService: CrisisDetectionService;

  beforeEach(() => {
    vi.resetAllMocks();
    crisisService = new CrisisDetectionService({
      aiService: mockAIService,
      model: "test-model",
    });
  });

  describe("detectCrisis", () => {
    it("should detect high-risk crisis correctly", async () => {
      // Mock the AI service response for high-risk crisis
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          is_crisis: true,
          risk_level: "high",
          crisis_type: "suicidal_ideation",
          confidence: 0.92,
          reasoning:
            "The text contains explicit statements about self-harm and suicide.",
        }),
        model: "test-model",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
      });

      const result = await crisisService.detectCrisis(
        "I can't take it anymore. I'm thinking of ending it all tonight.",
      );

      // Verify the result
      expect(result).toEqual({
        is_crisis: true,
        risk_level: "high",
        crisis_type: "suicidal_ideation",
        confidence: 0.92,
        reasoning:
          "The text contains explicit statements about self-harm and suicide.",
        model: "test-model",
        processingTime: expect.any(Number),
      });

      // Verify the AI service was called with correct parameters
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining(
              "I can't take it anymore. I'm thinking of ending it all tonight.",
            ),
          }),
        ]),
        expect.objectContaining({ model: "test-model" }),
      );
    });

    it("should detect medium-risk crisis correctly", async () => {
      // Mock the AI service response for medium-risk crisis
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          is_crisis: true,
          risk_level: "medium",
          crisis_type: "self_harm",
          confidence: 0.78,
          reasoning:
            "The text mentions self-harm but without immediate intent.",
        }),
        model: "test-model",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
      });

      const result = await crisisService.detectCrisis(
        "Sometimes I think about hurting myself when I feel overwhelmed.",
      );

      // Verify the result
      expect(result).toEqual({
        is_crisis: true,
        risk_level: "medium",
        crisis_type: "self_harm",
        confidence: 0.78,
        reasoning: "The text mentions self-harm but without immediate intent.",
        model: "test-model",
        processingTime: expect.any(Number),
      });
    });

    it("should detect low-risk crisis correctly", async () => {
      // Mock the AI service response for low-risk crisis
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          is_crisis: true,
          risk_level: "low",
          crisis_type: "depression",
          confidence: 0.65,
          reasoning:
            "The text indicates depressive symptoms but no immediate danger.",
        }),
        model: "test-model",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
      });

      const result = await crisisService.detectCrisis(
        "I've been feeling really down lately. Nothing seems to matter.",
      );

      // Verify the result
      expect(result).toEqual({
        is_crisis: true,
        risk_level: "low",
        crisis_type: "depression",
        confidence: 0.65,
        reasoning:
          "The text indicates depressive symptoms but no immediate danger.",
        model: "test-model",
        processingTime: expect.any(Number),
      });
    });

    it("should correctly identify non-crisis text", async () => {
      // Mock the AI service response for non-crisis
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          is_crisis: false,
          risk_level: "none",
          crisis_type: null,
          confidence: 0.95,
          reasoning:
            "The text does not contain any indicators of crisis or self-harm.",
        }),
        model: "test-model",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
      });

      const result = await crisisService.detectCrisis(
        "I had a good day today. The weather was nice and I enjoyed my walk.",
      );

      // Verify the result
      expect(result).toEqual({
        is_crisis: false,
        risk_level: "none",
        crisis_type: null,
        confidence: 0.95,
        reasoning:
          "The text does not contain any indicators of crisis or self-harm.",
        model: "test-model",
        processingTime: expect.any(Number),
      });
    });

    it("should handle invalid JSON responses", async () => {
      // Mock the AI service response with invalid JSON
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: "Not a valid JSON response",
        model: "test-model",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
      });

      await expect(crisisService.detectCrisis("Test text")).rejects.toThrow();
    });

    it("should handle AI service errors", async () => {
      // Mock the AI service to throw an error
      (mockAIService.createChatCompletion as any).mockRejectedValue(
        new Error("AI service error"),
      );

      await expect(crisisService.detectCrisis("Test text")).rejects.toThrow(
        "AI service error",
      );
    });

    it("should respect sensitivity level", async () => {
      // Mock the AI service response
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          is_crisis: true,
          risk_level: "medium",
          crisis_type: "anxiety",
          confidence: 0.75,
          reasoning: "The text indicates anxiety symptoms.",
        }),
        model: "test-model",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
      });

      // Test with high sensitivity
      await crisisService.detectCrisis(
        "I'm feeling really anxious about everything.",
        { sensitivity: "high" },
      );

      // Verify the AI service was called with sensitivity parameter
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("high sensitivity"),
          }),
          expect.objectContaining({ role: "user" }),
        ]),
        expect.objectContaining({ model: "test-model" }),
      );

      // Reset mocks
      vi.resetAllMocks();
      (mockAIService.createChatCompletion as any).mockResolvedValue({
        content: JSON.stringify({
          is_crisis: false,
          risk_level: "none",
          crisis_type: null,
          confidence: 0.75,
          reasoning:
            "The text indicates anxiety symptoms but doesn't meet low sensitivity threshold.",
        }),
        model: "test-model",
        usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
      });

      // Test with low sensitivity
      await crisisService.detectCrisis(
        "I'm feeling really anxious about everything.",
        { sensitivity: "low" },
      );

      // Verify the AI service was called with sensitivity parameter
      expect(mockAIService.createChatCompletion).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("low sensitivity"),
          }),
          expect.objectContaining({ role: "user" }),
        ]),
        expect.objectContaining({ model: "test-model" }),
      );
    });
  });

  describe("detectCrisisBatch", () => {
    it("should analyze multiple texts in parallel", async () => {
      // Mock the AI service response for multiple calls
      (mockAIService.createChatCompletion as any)
        .mockResolvedValueOnce({
          content: JSON.stringify({
            is_crisis: true,
            risk_level: "high",
            crisis_type: "suicidal_ideation",
            confidence: 0.92,
            reasoning: "High risk text",
          }),
          model: "test-model",
          usage: {
            total_tokens: 100,
            prompt_tokens: 50,
            completion_tokens: 50,
          },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            is_crisis: false,
            risk_level: "none",
            crisis_type: null,
            confidence: 0.95,
            reasoning: "No risk text",
          }),
          model: "test-model",
          usage: {
            total_tokens: 100,
            prompt_tokens: 50,
            completion_tokens: 50,
          },
        });

      const results = await crisisService.detectCrisisBatch([
        "I can't take it anymore",
        "I had a good day today",
      ]);

      // Verify the results
      expect(results).toHaveLength(2);
      expect(results[0].is_crisis).toBe(true);
      expect(results[0].risk_level).toBe("high");
      expect(results[1].is_crisis).toBe(false);
      expect(results[1].risk_level).toBe("none");

      // Verify the AI service was called twice
      expect(mockAIService.createChatCompletion).toHaveBeenCalledTimes(2);
    });

    it("should handle errors in batch processing", async () => {
      // Mock the AI service to succeed for first call and fail for second
      (mockAIService.createChatCompletion as any)
        .mockResolvedValueOnce({
          content: JSON.stringify({
            is_crisis: true,
            risk_level: "high",
            crisis_type: "suicidal_ideation",
            confidence: 0.92,
            reasoning: "High risk text",
          }),
          model: "test-model",
          usage: {
            total_tokens: 100,
            prompt_tokens: 50,
            completion_tokens: 50,
          },
        })
        .mockRejectedValueOnce(new Error("AI service error"));

      await expect(
        crisisService.detectCrisisBatch([
          "I can't take it anymore",
          "I had a good day today",
        ]),
      ).rejects.toThrow();
    });
  });

  describe("constructor", () => {
    it("should use default model if not provided", () => {
      const service = new CrisisDetectionService({
        aiService: mockAIService,
      });

      // Use a non-public method to test the model
      expect((service as any).config.model).toBe("gpt-4o");
    });

    it("should use custom system prompt if provided", () => {
      const customPrompt = "Custom system prompt";
      const service = new CrisisDetectionService({
        aiService: mockAIService,
        systemPrompt: customPrompt,
      });

      expect((service as any).config.systemPrompt).toBe(customPrompt);
    });
  });
});
