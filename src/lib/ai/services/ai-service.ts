import type {
  AICapability,
  AICompletionOptions,
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIModelType,
  AIProvider,
  AIRole,
  AIService as AIServiceInterface,
  AIServiceOptions,
  AIStreamChunk,
  AIStreamOptions,
  AIUsageRecord,
  ModelInfo,
} from '../models/types'
import type { CacheConfig } from './cache-service'
import type { ConnectionPoolConfig } from './connection-pool'
import type { FallbackServiceConfig } from './fallback-service'
import type { PromptOptimizerConfig } from './prompt-optimizer'
import { AICacheService } from './cache-service'
import { ConnectionPoolManager } from './connection-pool'
import { FallbackService } from './fallback-service'
import { PromptOptimizerService } from './prompt-optimizer'
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
  private models: Map<string, ModelInfo>

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

    this.models = this.initializeModels()
  }

  private initializeModels(): Map<string, ModelInfo> {
    const models = new Map<string, ModelInfo>()

    models.set('gpt-4', {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: AIProvider.OpenAI,
      type: AIModelType.Chat,
      contextWindow: 8192,
      maxTokens: 4096,
      capabilities: [AICapability.Chat, AICapability.Completion],
      pricing: {
        input: 0.03,
        output: 0.06,
        unit: 'token',
        currency: 'USD',
      },
      parameters: {
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      },
    })

    models.set('claude-3', {
      id: 'claude-3',
      name: 'Claude 3',
      provider: AIProvider.Anthropic,
      type: AIModelType.Chat,
      contextWindow: 100000,
      maxTokens: 4096,
      capabilities: [AICapability.Chat, AICapability.Completion],
      pricing: {
        input: 0.02,
        output: 0.04,
        unit: 'token',
        currency: 'USD',
      },
      parameters: {
        temperature: 0.7,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      },
    })

    return models
  }

  getModelInfo(modelId: string): ModelInfo {
    const model = this.models.get(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }
    return model
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    messages: AIMessage[],
    options?: AICompletionOptions,
  ): Promise<AICompletionResponse> {
    const response = await this.togetherService.createChatCompletion(
      messages,
      options,
    )
    return {
      id: response.id,
      model: response.model,
      choices: response.choices.map((choice) => ({
        message: {
          role: choice.message.role as AIRole,
          content: choice.message.content,
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
  createChatStream(
    messages: AIMessage[],
    options?: AIStreamOptions,
  ): ReadableStream<AIStreamChunk> {
    const stream = this.togetherService.createStreamingChatCompletion(
      messages,
      options,
    )
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of await stream) {
            controller.enqueue({
              id: chunk.id,
              model: chunk.model,
              provider: chunk.provider,
              isComplete: chunk.isComplete,
              choices: chunk.choices.map((choice) => ({
                message: {
                  role: choice.message.role as AIRole,
                  content: choice.message.content,
                },
                finishReason: choice.finishReason,
              })),
              usage: chunk.usage && {
                promptTokens: chunk.usage.promptTokens,
                completionTokens: chunk.usage.completionTokens,
                totalTokens: chunk.usage.totalTokens,
              },
            })
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })
  }

  /**
   * Generate completion
   */
  async generateCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {},
  ): Promise<AICompletionResponse> {
    const response = (await this.togetherService.generateCompletion(
      messages,
      options,
    )) as ServiceResponse

    // Construct a fully compliant AICompletionResponse
    return {
      id: response.id || `gen-${Date.now()}`,
      model: response.model,
      created: response.created || Date.now(),
      provider: 'together',
      content: response.content,
      choices: response.choices.map((choice) => ({
        message: {
          role: choice.message.role as AIRole,
          content: choice.message.content,
        },
        finishReason: choice.finishReason,
      })),
      usage: response.usage,
    }
  }

  /**
   * Create a chat completion with usage tracking
   */
  async createChatCompletionWithTracking(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<AICompletionResponse> {
    const response =
      (await this.togetherService.createChatCompletionWithTracking(
        messages,
        options,
      )) as ServiceResponse

    // Construct a fully compliant AICompletionResponse
    return {
      id: response.id || `track-${Date.now()}`,
      model: response.model,
      created: response.created || Date.now(),
      provider: 'together',
      content: response.content,
      choices: response.choices.map((choice) => ({
        message: {
          role: choice.message.role as AIRole,
          content: choice.message.content,
        },
        finishReason: choice.finishReason,
      })),
      usage: response.usage,
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
    return this.defaultReques
  }

  async createStreamingChatCompletion(
    messages: AIMessage[],
    options?: AIStreamOptions,
  ): Promise<AsyncGenerator<AIStreamChunk, void, void>> {
    const stream = await this.togetherService.createStreamingChatCompletion(
      messages,
      options,
    )
    return stream
  }

  async dispose(): Promise<void> {
    await this.togetherService.dispose()
    this.cacheService.dispose()
    this.promptOptimizer.dispose()
    this.connectionPool.dispose()
    this.fallbackService.dispose()
  }
}
