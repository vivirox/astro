import type {
  AICompletionRequest,
  AICompletionResponse,
  AIUsageRecord,
  AIStreamChunk,
  AIMessage,
  AIService as AIServiceInterface,
  AIServiceOptions,
} from '../models/types'
import { AICacheService, type CacheConfig } from './cache-service'
import {
  PromptOptimizerService,
  type PromptOptimizerConfig,
} from './prompt-optimizer'
import {
  ConnectionPoolManager,
  type ConnectionPoolConfig,
} from './connection-pool'
import { FallbackService, type FallbackServiceConfig } from './fallback-service'
import { createTogetherAIService } from './together'

// Define proper interfaces for API responses
interface ServiceResponse {
  id?: string
  model: string
  created?: number
  content: string
  choices?: {
    message: { role: string; content: string }
    finishReason?: string
  }[]
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * Model information interface
 */
interface ModelInfo {
  id: string
  name: string
  provider: string
  parameters?: number
  context_length?: number
  capabilities?: string[]
  [key: string]: unknown
}

/**
 * AI Service Configuration
 */
export interface AIServiceConfig {
  together?: {
    apiKey?: string
    baseUrl?: string
  }
  cache?: CacheConfig
  promptOptimizer?: PromptOptimizerConfig
  connectionPool?: ConnectionPoolConfig
  fallback?: FallbackServiceConfig
  onUsage?: (usage: AIUsageRecord) => Promise<void>
}

/**
 * AI Service Implementation
 *
 * This service provides a unified interface to TogetherAI with performance optimizations
 */
export class AIService implements AIServiceInterface {
  private togetherService: ReturnType<typeof createTogetherAIService>
  private cacheService: AICacheService
  private promptOptimizer: PromptOptimizerService
  private connectionPool: ConnectionPoolManager
  private fallbackService: FallbackService
  private onUsage?: (usage: AIUsageRecord) => Promise<void>
  private defaultRequest: Partial<AICompletionRequest> = {}

  constructor(config: AIServiceConfig = {}) {
    // Initialize services
    this.cacheService = new AICacheService(config.cache)
    this.promptOptimizer = new PromptOptimizerService(config.promptOptimizer)
    this.connectionPool = new ConnectionPoolManager(config.connectionPool)
    this.fallbackService = new FallbackService(config.fallback)

    // Initialize TogetherAI provider
    this.togetherService = config.together?.apiKey
      ? createTogetherAIService({
          apiKey: config.together.apiKey,
          togetherApiKey: config.together.apiKey,
          togetherBaseUrl: config.together.baseUrl,
        })
      : createTogetherAIService({
          apiKey: process.env.TOGETHER_API_KEY || '',
          togetherApiKey: process.env.TOGETHER_API_KEY || '',
          togetherBaseUrl: process.env.TOGETHER_BASE_URL,
        })

    // Set usage callback
    this.onUsage = config.onUsage
  }

  /**
   * Get information about a model
   */
  getModelInfo(model: string): ModelInfo {
    return this.togetherService.getModelInfo(model) as ModelInfo
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {}
  ): Promise<AICompletionResponse> {
    const response = (await this.togetherService.createChatCompletion(
      messages,
      options
    )) as ServiceResponse

    // Construct a fully compliant AICompletionResponse
    return {
      id: response.id || `chat-${Date.now()}`,
      model: response.model,
      created: response.created || Date.now(),
      provider: 'together',
      content: response.content,
      choices: (response.choices || []).map((choice) => ({
        message: {
          role: choice.message?.role || 'assistant',
          content: choice.message?.content || '',
        },
        finishReason: choice.finishReason,
      })),
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
      },
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {}
  ): Promise<ReadableStream<AIStreamChunk>> {
    // Get the stream from the service
    const stream = await this.togetherService.createStreamingChatCompletion(
      messages,
      options
    )

    // Return as proper ReadableStream
    return stream as ReadableStream<AIStreamChunk>
  }

  /**
   * Generate completion
   */
  async generateCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {}
  ): Promise<AICompletionResponse> {
    const response = (await this.togetherService.generateCompletion(
      messages,
      options
    )) as ServiceResponse

    // Construct a fully compliant AICompletionResponse
    return {
      id: response.id || `gen-${Date.now()}`,
      model: response.model,
      created: response.created || Date.now(),
      provider: 'together',
      content: response.content,
      choices: (response.choices || []).map((choice) => ({
        message: {
          role: choice.message?.role || 'assistant',
          content: choice.message?.content || '',
        },
        finishReason: choice.finishReason,
      })),
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
      },
    }
  }

  /**
   * Create a chat completion with usage tracking
   */
  async createChatCompletionWithTracking(
    messages: AIMessage[],
    options?: AIServiceOptions
  ): Promise<AICompletionResponse> {
    const response =
      (await this.togetherService.createChatCompletionWithTracking(
        messages,
        options
      )) as ServiceResponse

    // Construct a fully compliant AICompletionResponse
    return {
      id: response.id || `track-${Date.now()}`,
      model: response.model,
      created: response.created || Date.now(),
      provider: 'together',
      content: response.content,
      choices: (response.choices || []).map((choice) => ({
        message: {
          role: choice.message?.role || 'assistant',
          content: choice.message?.content || '',
        },
        finishReason: choice.finishReason,
      })),
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
      },
    }
  }

  /**
   * Helper methods for advanced optimizations
   */
  getCacheService(): AICacheService {
    return this.cacheService
  }

  getPromptOptimizer(): PromptOptimizerService {
    return this.promptOptimizer
  }

  getConnectionPool(): ConnectionPoolManager {
    return this.connectionPool
  }

  getFallbackService(): FallbackService {
    return this.fallbackService
  }

  getDefaultRequest(): Partial<AICompletionRequest> {
    return this.defaultRequest
  }

  dispose(): void {
    this.togetherService.dispose()
    this.cacheService.dispose()
    this.promptOptimizer.dispose()
    this.connectionPool.dispose()
    this.fallbackService.dispose()
  }
}
