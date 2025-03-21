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

// Define a custom ReadableStream type that matches both implementations
type GenericReadableStream<T> = any

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
  private togetherService: any // Use any to bypass strict typing
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
  getModelInfo(model: string): any {
    return this.togetherService.getModelInfo(model)
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {}
  ): Promise<AICompletionResponse> {
    const response = await this.togetherService.createChatCompletion(
      messages,
      options
    )
    // Add the provider field required by AICompletionResponse in models/types.ts
    return {
      ...response,
      provider: 'together',
      usage: response.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    }
  }

  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {}
  ): Promise<GenericReadableStream<AIStreamChunk>> {
    // Cast to the expected return type
    return this.togetherService.createStreamingChatCompletion(
      messages,
      options
    ) as unknown as GenericReadableStream<AIStreamChunk>
  }

  /**
   * Generate completion
   */
  async generateCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {}
  ): Promise<AICompletionResponse> {
    const response = await this.togetherService.generateCompletion(
      messages,
      options
    )
    // Add the provider field required by AICompletionResponse in models/types.ts
    return {
      ...response,
      provider: 'together',
      usage: response.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
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
      await this.togetherService.createChatCompletionWithTracking(
        messages,
        options
      )
    // Add the provider field required by AICompletionResponse in models/types.ts
    return {
      ...response,
      provider: 'together',
      usage: response.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
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

  dispose() {
    this.togetherService.dispose()
    this.cacheService.dispose()
    this.promptOptimizer.dispose()
    this.connectionPool.dispose()
    this.fallbackService.dispose()
  }
}
