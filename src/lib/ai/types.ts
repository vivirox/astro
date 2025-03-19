// This file is deprecated and should be removed.
// Please use ai-types.ts instead.
// This file is only kept temporarily for backward compatibility

// Re-export from ai-types.ts to maintain compatibility
export * from "./models/ai-types";

export type AIProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "azure"
  | "deepseek"
  | "local";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  maxTokens: number;
  contextWindow: number;
}

export interface AIModelResponse {
  model: string;
  choices: Array<{
    message?: {
      content: string;
    };
  }>;
  usage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
  error?: string;
}

// Message type for AI conversations
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// AI service configuration
export interface AIServiceConfig {
  model: string;
  temperature?: number;
  maxResponseTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// Token usage information
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// AI service response
export interface AIServiceResponse {
  content: string;
  usage?: TokenUsage;
  model: string;
  provider: string;
}

// Response generation service configuration
export interface ResponseGenerationConfig {
  aiService: any; // The AI service instance
  model: string;
  temperature?: number;
  maxResponseTokens?: number;
}

// Sentiment analysis result
export interface SentimentAnalysisResult {
  sentiment: "positive" | "negative" | "neutral";
  score: number;
  confidence: number;
  content: string;
  usage?: TokenUsage;
}

// Crisis detection result
export interface CrisisDetectionResult {
  hasCrisis: boolean;
  riskLevel: "none" | "low" | "medium" | "high" | "severe";
  confidence: number;
  categories?: string[];
  explanation?: string;
  content: string;
  usage?: TokenUsage;
}

// Intervention analysis result
export interface InterventionAnalysisResult {
  effectiveness: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  content: string;
  usage?: TokenUsage;
}
