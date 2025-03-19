/**
 * AI Provider types
 */
export type AIProvider = "together";

/**
 * AI Model types
 */
export interface AIModel {
  id: string;
  name: string;
  provider: "together";
  capabilities: (
    | "chat"
    | "sentiment"
    | "crisis"
    | "response"
    | "intervention"
    | "code"
  )[];
  contextWindow: number;
  maxTokens: number;
  togetherModelId: string;
  costPer1KTokens?: {
    input: number;
    output: number;
  };
}

/**
 * AI Message types
 */
export interface AIMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
}

/**
 * AI Completion Request
 */
export interface AICompletionRequest {
  messages: AIMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

/**
 * AI Completion Response
 */
export interface AICompletionResponse {
  id: string;
  model: string;
  choices: {
    message: AIMessage;
    finishReason: string;
  }[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI Stream Chunk
 */
export interface AIStreamChunk {
  id: string;
  model: string;
  choices: {
    delta: {
      role?: string;
      content: string;
    };
    finishReason: string | null;
  }[];
}

/**
 * AI Error
 */
export interface AIError {
  message: string;
  type: string;
  param: string | null;
  code: number;
}

/**
 * AI Usage Record
 */
export interface AIUsageRecord {
  timestamp: number;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  processingTimeMs: number;
  userId?: string;
  requestId?: string;
  cost?: number;
}
