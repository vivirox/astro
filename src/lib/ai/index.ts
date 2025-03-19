// Export types
export * from "./models/ai-types";

// Export model registry
export * from "./models/registry";

// Export providers
export { TogetherAIProvider } from "./providers/together";

// Export services
export { AIService, type AIServiceConfig } from "./services/ai-service";
export {
  SentimentAnalysisService,
  type SentimentAnalysisConfig,
} from "./services/sentiment-analysis";
export {
  CrisisDetectionService,
  type CrisisDetectionConfig,
} from "./services/crisis-detection";
export {
  ResponseGenerationService,
  type ResponseGenerationConfig,
} from "./services/response-generation";
export {
  InterventionAnalysisService,
  type InterventionAnalysisConfig,
  type InterventionAnalysisResult,
} from "./services/intervention-analysis";

// Export performance optimization services
export { AICacheService, type CacheConfig } from "./services/cache-service";
export {
  PromptOptimizerService,
  type PromptOptimizerConfig,
} from "./services/prompt-optimizer";
export {
  ConnectionPoolManager,
  type ConnectionPoolConfig,
} from "./services/connection-pool";
export {
  FallbackService,
  type FallbackServiceConfig,
} from "./services/fallback-service";

// Export AI service factory
export * from "./factory";

// Export AI services
export * from "./services/sentiment-analysis";
export * from "./services/crisis-detection";
export * from "./services/response-generation";
export * from "./services/intervention-analysis";

// Export error handling utilities
export * from "./error-handling";

// Export performance optimization utilities
export * from "./performance";

/**
 * Create a new AI service with the provided configuration
 */
export function createAIService(config: AIServiceConfig) {
  return new AIService(config);
}

/**
 * Create a sentiment analysis service with the provided AI service
 */
export function createSentimentAnalysisService(
  aiService: AIService,
  model?: string,
  defaultPrompt?: string,
) {
  return new SentimentAnalysisService({
    aiService,
    model,
    defaultPrompt,
  });
}

/**
 * Create a crisis detection service with the provided AI service
 */
export function createCrisisDetectionService(
  aiService: AIService,
  model?: string,
  defaultPrompt?: string,
  sensitivityLevel?: "low" | "medium" | "high",
) {
  return new CrisisDetectionService({
    aiService,
    model,
    defaultPrompt,
    sensitivityLevel,
  });
}

/**
 * Create a response generation service with the provided AI service
 */
export function createResponseGenerationService(
  aiService: AIService,
  model?: string,
  systemPrompt?: string,
  maxResponseTokens?: number,
  temperature?: number,
) {
  return new ResponseGenerationService({
    aiService,
    model,
    systemPrompt,
    maxResponseTokens,
    temperature,
  });
}

/**
 * Create an intervention analysis service with the provided AI service
 */
export function createInterventionAnalysisService(
  aiService: AIService,
  model?: string,
  systemPrompt?: string,
) {
  return new InterventionAnalysisService({
    aiService,
    model,
    systemPrompt,
  });
}

/**
 * AI Message Types
 */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Sentiment Analysis Types
 */
export interface SentimentResult {
  score: number; // -1 to 1, where -1 is very negative, 1 is very positive
  label: "negative" | "neutral" | "positive";
  confidence: number; // 0 to 1
  emotions?: Record<string, number>; // Optional map of emotions to scores (0-1)
}

/**
 * Crisis Detection Types
 */
export interface CrisisDetectionResult {
  isCrisis: boolean;
  confidence: number; // 0 to 1
  category?: string; // Optional category of crisis (e.g., "self-harm", "suicide", "abuse")
  severity?: "low" | "medium" | "high";
  recommendedAction?: string;
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
