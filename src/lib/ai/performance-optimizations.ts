import type {
  AIMessage,
  AIService,
  AIServiceOptions,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from './models/ai-types'
import { estimateMessagesTokenCount, truncateMessages } from './performance'
import { v4 as uuidv4 } from 'uuid'
import type { AuditLogEntry } from '../audit/log'
import { createAuditLog } from '../audit/log'

/**
 * Advanced caching options
 */
export interface AdvancedCacheOptions {
  /**
   * Whether to enable caching
   */
  enabled?: boolean

  /**
   * Time-to-live for cache entries in milliseconds
   */
  ttl?: number

  /**
   * Maximum number of entries to store in the cache
   */
  maxEntries?: number

  /**
   * Function to generate a cache key from messages and options
   */
  keyGenerator?: (messages: AIMessage[], options?: AIServiceOptions) => string

  /**
   * Whether to use Redis for distributed caching
   */
  useRedis?: boolean

  /**
   * Redis connection string (required if useRedis is true)
   */
  redisUrl?: string

  /**
   * Redis key prefix
   */
  redisKeyPrefix?: string

  /**
   * Whether to use tiered caching (memory + Redis)
   */
  useTieredCaching?: boolean

  /**
   * Memory cache TTL for tiered caching (shorter than Redis TTL)
   */
  memoryTtl?: number
}

/**
 * Request batching options
 */
export interface RequestBatchingOptions {
  /**
   * Whether to enable request batching
   */
  enabled?: boolean

  /**
   * Maximum batch size
   */
  maxBatchSize?: number

  /**
   * Maximum wait time for batching in milliseconds
   */
  maxWaitTime?: number
}

/**
 * Token optimization options
 */
export interface TokenOptimizationOptions {
  /**
   * Whether to enable token optimization
   */
  enabled?: boolean

  /**
   * Maximum tokens to use for contex
   */
  maxContextTokens?: number

  /**
   * Tokens to reserve for response
   */
  reserveTokens?: number

  /**
   * Whether to use semantic message compression
   */
  useSemanticCompression?: boolean

  /**
   * Whether to prioritize system messages
   */
  prioritizeSystemMessages?: boolean

  /**
   * Whether to prioritize recent messages
   */
  prioritizeRecentMessages?: boolean
}

/**
 * Advanced performance options
 */
export interface AdvancedPerformanceOptions {
  /**
   * Advanced caching options
   */
  caching?: AdvancedCacheOptions

  /**
   * Request batching options
   */
  batching?: RequestBatchingOptions

  /**
   * Token optimization options
   */
  tokenOptimization?: TokenOptimizationOptions

  /**
   * Whether to enable adaptive model selection
   */
  enableAdaptiveModelSelection?: boolean

  /**
   * Whether to enable request prioritization
   */
  enableRequestPrioritization?: boolean

  /**
   * Whether to enable performance analytics
   */
  enablePerformanceAnalytics?: boolean

  // Caching options
  enableCache?: boolean
  cacheTTL?: number // Time to live in seconds

  // Rate limiting options
  enableRateLimit?: boolean
  maxRequestsPerMinute?: number

  // Token optimization options
  maxContextLength?: number

  // Batching options
  enableBatching?: boolean
  batchWindow?: number // Time window in ms to batch requests
  maxBatchSize?: number

  // Fallback options
  enableFallback?: boolean
  fallbackModels?: string[]

  // Tracking options
  enableDetailedTracking?: boolean
}

/**
 * Semantic message compression for token optimization
 */
function compressMessages(
  messages: AIMessage[],
  maxTokens: number
): AIMessage[] {
  // This is a placeholder for a more sophisticated implementation
  // In a real implementation, we would use an embedding model to compress messages
  // while preserving semantic meaning

  // For now, we'll just use the truncateMessages function
  return truncateMessages(messages, maxTokens)
}

/**
 * Creates an advanced performance-optimized AI service
 */
export function createAdvancedOptimizedAIService(
  aiService: AIService,
  options: AdvancedPerformanceOptions = {}
): AIService {
  // Initialize token optimization options
  const {
    enabled: tokenOptimizationEnabled = true,
    maxContextTokens = 4000,
    reserveTokens = 1000,
    useSemanticCompression = false,
  } = options.tokenOptimization ?? {}

  // Initialize caching options
  const cacheOptions = options.caching ?? {}

  /**
   * Track performance metrics
   */
  async function trackPerformance(metrics: {
    model: string
    latency: number
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    success: boolean
    errorCode?: string
    cached?: boolean
    optimized?: boolean
    user_id?: string
  }): Promise<void> {
    if (!options.enablePerformanceAnalytics) return

    try {
      // Log to console
      console.log('[AI Performance]', {
        model: metrics.model,
        latency: `${metrics.latency}ms`,
        tokens: metrics.totalTokens,
        success: metrics.success,
        cached: metrics.cached,
        optimized: metrics.optimized,
      })

      // Create audit log
      await createAuditLog(metrics.user_id || 'system', 'ai.request', 'ai', {
        model: metrics.model,
        latency: metrics.latency,
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        totalTokens: metrics.totalTokens,
        errorCode: metrics.errorCode,
        cached: metrics.cached,
        optimized: metrics.optimized,
      })
    } catch (error) {
      console.error('Failed to track performance metrics:', error)
    }
  }

  /**
   * Optimize messages for token usage
   */
  function optimizeMessages(
    messages: AIMessage[],
    model: string
  ): {
    messages: AIMessage[]
    optimized: boolean
  } {
    if (!tokenOptimizationEnabled) return { messages, optimized: false }

    // Estimate token count
    const estimatedTokens = estimateMessagesTokenCount(messages)

    // If we're under the limit, return as is
    if (estimatedTokens <= maxContextTokens - reserveTokens) {
      return { messages, optimized: false }
    }

    // Use semantic compression if enabled, otherwise use truncation
    const optimizedMessages = useSemanticCompression
      ? compressMessages(messages, maxContextTokens - reserveTokens)
      : truncateMessages(messages, maxContextTokens, reserveTokens)

    return { messages: optimizedMessages, optimized: true }
  }

  /**
   * Select the optimal model based on the request
   */
  function selectOptimalModel(
    messages: AIMessage[],
    requestedModel: string
  ): string {
    if (!options.enableAdaptiveModelSelection) return requestedModel

    // This is a placeholder for a more sophisticated implementation
    // In a real implementation, we would analyze the messages and select the most
    // appropriate model based on complexity, length, etc.
    return requestedModel
  }

  /**
   * Optimize tokens by truncating or summarizing contex
   */
  function optimizeTokens(
    request: AICompletionRequest,
    maxContextLength: number
  ): AICompletionRequest {
    // Simple optimization: if too many messages, keep the first one (system prompt)
    // and the most recent ones up to a token limit
    if (request.messages.length <= 2) return request

    const systemMessage =
      request.messages[0].role === 'system' ? request.messages[0] : null
    const messages = systemMessage
      ? request.messages.slice(1)
      : request.messages

    // Rough token estimation (4 chars ≈ 1 token)
    let tokenCount = 0
    const optimizedMessages = []

    // Always include system message if present
    if (systemMessage) {
      optimizedMessages.push(systemMessage)
      tokenCount += Math.ceil(systemMessage.content.length / 4)
    }

    // Add messages from newest to oldest until we hit the limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      const messageTokens = Math.ceil(message.content.length / 4)

      if (tokenCount + messageTokens <= maxContextLength) {
        optimizedMessages.unshift(message)
        tokenCount += messageTokens
      } else {
        // If we can't fit the whole message, we're done
        break
      }
    }

    return {
      ...request,
      messages: optimizedMessages,
    }
  }

  /**
   * Prepares the request by optimizing tokens and selecting the optimal model
   */
  function prepareRequest(
    messages: AIMessage[],
    options?: AIServiceOptions
  ): {
    optimizedMessages: AIMessage[]
    model: string
  } {
    const { messages: optimizedMessages } = optimizeMessages(
      messages,
      options?.model || 'default-model'
    )
    const model = selectOptimalModel(
      optimizedMessages,
      options?.model || 'default-model'
    )

    return {
      optimizedMessages,
      model,
    }
  }

  // Return the service implementation
  return {
    createChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ): Promise<AICompletionResponse> => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.createChatCompletion(optimizedMessages, {
        ...options,
        model,
        temperature: options?.temperature ?? 1.0,
      })
    },

    createStreamingChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ) => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.createStreamingChatCompletion(optimizedMessages, {
        ...options,
        model,
        temperature: options?.temperature ?? 1.0,
      })
    },

    getModelInfo: (model: string): any => {
      return aiService.getModelInfo(model)
    },

    createChatCompletionWithTracking: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ): Promise<AICompletionResponse> => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.createChatCompletionWithTracking(optimizedMessages, {
        ...options,
        model,
        temperature: options?.temperature ?? 1.0,
      })
    },

    generateCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ): Promise<AICompletionResponse> => {
      const { optimizedMessages, model } = prepareRequest(messages, options)
      return aiService.generateCompletion(optimizedMessages, {
        ...options,
        model,
        temperature: options?.temperature ?? 1.0,
      })
    },

    dispose: () => {
      aiService.dispose()
    },
  }
}
