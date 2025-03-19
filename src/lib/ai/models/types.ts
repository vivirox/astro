// This file is deprecated and should be removed.
// Please use ai-types.ts instead.
// This file is only kept temporarily for backward compatibility

// Re-export from ai-types.ts to maintain compatibility
export * from "./ai-types";

/**
 * AI Provider types
 */
export type AIProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure"
  | "deepseek"
  | "local";

/**
 * AI Model types
 */
export interface AIModel {
  id: string;
  name: string;
  provider: "openai" | "anthropic" | "google" | "azure" | "deepseek" | "local";
  capabilities: (
    | "chat"
    | "sentiment"
    | "crisis"
    | "response"
    | "intervention"
  )[];
  contextWindow: number;
  maxTokens: number;
  costPer1KTokens?: {
    input: number;
    output: number;
  };
}

export type ModelCapability =
  | "chat"
  | "completion"
  | "embedding"
  | "function-calling"
  | "vision"
  | "streaming";

/**
 * Message types
 */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Request types
 */
export interface AICompletionRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  functions?: AIFunction[];
  function_call?: "auto" | "none" | { name: string };
}

export interface AIFunction {
  name: string;
  description?: string;
  parameters: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

/**
 * Response types
 */
export interface AICompletionResponse {
  id: string;
  model: string;
  provider: AIProvider;
  created: number;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * Streaming response types
 */
export interface AIStreamChunk {
  id: string;
  model: string;
  provider: AIProvider;
  created: number;
  content: string;
  isComplete: boolean;
  function_call?: {
    name: string;
    arguments: string;
  };
}

/**
 * Error types
 */
export interface AIError {
  message: string;
  type:
    | "rate_limit"
    | "invalid_request"
    | "authentication"
    | "server"
    | "timeout"
    | "unknown";
  provider: AIProvider;
  status?: number;
  retryAfter?: number;
}

/**
 * Sentiment analysis types
 */
export interface SentimentResult {
  score: number; // -1 to 1, where -1 is very negative, 1 is very positive
  label: "negative" | "neutral" | "positive";
  confidence: number; // 0 to 1
  emotions?: Record<string, number>; // Optional map of emotions to scores (0-1)
}

/**
 * Crisis detection types
 */
export interface CrisisDetectionResult {
  isCrisis: boolean;
  confidence: number; // 0 to 1
  category?: string; // Optional category of crisis (e.g., "self-harm", "suicide", "abuse")
  severity?: "low" | "medium" | "high";
  recommendedAction?: string;
}

/**
 * Usage tracking types
 */
export interface AIUsageRecord {
  id: string;
  userId: string;
  model: string;
  provider: AIProvider;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: Date;
  conversationId?: string;
  messageId?: string;
  latencyMs?: number;
}

/**
 * Response Generation Types
 */
export interface ResponseGenerationResult {
  response: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    processingTime?: number;
  };
}

/**
 * Intervention Effectiveness Types
 */
export interface InterventionEffectivenessResult {
  score: number; // 0 to 1, where 0 is ineffective, 1 is very effective
  confidence: number; // 0 to 1
  recommendations?: string[];
  areas?: {
    name: string;
    score: number;
  }[];
}

/**
 * API Request Types
 */
export interface ChatCompletionRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface SentimentAnalysisRequest {
  model: string;
  text: string;
}

export interface CrisisDetectionRequest {
  model: string;
  text: string;
  sensitivityLevel?: "low" | "medium" | "high";
}

export interface ResponseGenerationRequest {
  model: string;
  messages: AIMessage[];
  temperature?: number;
  maxResponseTokens?: number;
  instructions?: string;
}

export interface InterventionEffectivenessRequest {
  model: string;
  conversation: AIMessage[];
  interventionMessage: string;
  userResponse: string;
}
