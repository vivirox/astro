import type { AIService, AIMessage, AIServiceOptions } from './models/ai-types'
import { createAuditLog } from '../audit'
import { checkRateLimit } from '../../lib/rate-limit'

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
  requestId: string
  model: string
  startTime: number
  endTime: number
  latency: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  success: boolean
  errorCode?: string
  cached?: boolean
  optimized?: boolean
  userId?: string
}

/**
 * Options for the performance monitoring service
 */
export interface PerformanceMonitorOptions {
  /**
   * Whether to log metrics to the console
   */
  logToConsole?: boolean

  /**
   * Whether to create audit logs for performance metrics
   */
  createAuditLogs?: boolean

  /**
   * Latency threshold in ms for slow request warnings
   */
  slowRequestThreshold?: number

  /**
   * Token usage threshold for high token usage warnings
   */
  highTokenUsageThreshold?: number

  /**
   * Custom callback for handling performance metrics
   */
  onMetricsCollected?: (metrics: PerformanceMetrics) => void
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
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
}

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * Simple in-memory LRU cache implementation
 */
class AIResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly options: Required<CacheOptions>

  constructor(options: CacheOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxEntries: options.maxEntries ?? 100,
      keyGenerator: options.keyGenerator ?? this.defaultKeyGenerator,
    }
  }

  /**
   * Default function to generate cache keys
   */
  private defaultKeyGenerator(
    messages: AIMessage[],
    options?: AIServiceOptions
  ): string {
    const messagesStr = JSON.stringify(messages)
    const optionsStr = options
      ? JSON.stringify({
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        })
      : ''

    return `${messagesStr}:${optionsStr}`
  }

  /**
   * Get a value from the cache
   */
  get(messages: AIMessage[], options?: AIServiceOptions): T | undefined {
    if (!this.options.enabled) return undefined

    const key = this.options.keyGenerator(messages, options)
    const entry = this.cache.get(key)

    if (!entry) return undefined

    // Check if the entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    // Move the entry to the end of the map to implement LRU behavior
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  /**
   * Set a value in the cache
   */
  set(
    messages: AIMessage[],
    options: AIServiceOptions | undefined,
    value: T
  ): void {
    if (!this.options.enabled) return

    const key = this.options.keyGenerator(messages, options)

    // Enforce max entries limit (LRU eviction)
    if (this.cache.size >= this.options.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.options.ttl,
    })
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size
  }
}

/**
 * Creates a performance-optimized AI service wrapper
 */
export function createOptimizedAIService(
  aiService: AIService,
  performanceOptions: PerformanceMonitorOptions = {},
  cacheOptions: CacheOptions = {},
  enableRateLimit = false,
  maxRequestsPerMinute = 10
): AIService {
  // Initialize the response cache
  const responseCache = new AIResponseCache<
    Awaited<ReturnType<AIService['createChatCompletion']>>
  >(cacheOptions)

  // Default performance options
  const options: Required<PerformanceMonitorOptions> = {
    logToConsole: performanceOptions.logToConsole ?? true,
    createAuditLogs: performanceOptions.createAuditLogs ?? true,
    slowRequestThreshold: performanceOptions.slowRequestThreshold ?? 3000, // 3 seconds
    highTokenUsageThreshold: performanceOptions.highTokenUsageThreshold ?? 1000,
    onMetricsCollected: performanceOptions.onMetricsCollected ?? (() => {}),
  }

  /**
   * Collects and processes performance metrics
   */
  const collectMetrics = async (metrics: PerformanceMetrics): Promise<void> => {
    // Log to console if enabled
    if (options.logToConsole) {
      console.log('[AI Performance]', {
        model: metrics.model,
        latency: `${metrics.latency}ms`,
        tokens: metrics.totalTokens,
        success: metrics.success,
        cached: metrics.cached,
        optimized: metrics.optimized,
      })
    }

    // Create audit log if enabled
    if (options.createAuditLogs) {
      await createAuditLog({
        action: 'ai.response',
        resource: 'ai',
        userId: metrics.userId || 'system',
        metadata: {
          requestId: metrics.requestId,
          model: metrics.model,
          latency: metrics.latency,
          inputTokens: metrics.inputTokens,
          outputTokens: metrics.outputTokens,
          totalTokens: metrics.totalTokens,
          errorCode: metrics.errorCode,
          cached: metrics.cached,
          optimized: metrics.optimized,
        },
      })
    }

    // Check for slow requests
    if (metrics.latency > options.slowRequestThreshold) {
      console.warn(
        `[AI Performance Warning] Slow request detected (${metrics.latency}ms) for model ${metrics.model}`
      )
    }

    // Check for high token usage
    if (
      metrics.totalTokens &&
      metrics.totalTokens > options.highTokenUsageThreshold
    ) {
      console.warn(
        `[AI Performance Warning] High token usage detected (${metrics.totalTokens} tokens) for model ${metrics.model}`
      )
    }

    // Call custom metrics handler if provided
    options.onMetricsCollected(metrics)
  }

  // Generate a unique request ID
  const generateRequestId = (): string => {
    return `req_${Math.random().toString(36).substring(2, 15)}`
  }

  return {
    createChatCompletion: async (messages, serviceOptions) => {
      // Check cache first
      const cachedResponse = responseCache.get(messages, serviceOptions)
      if (cachedResponse) {
        return cachedResponse
      }

      const startTime = Date.now()
      let success = false
      let errorCode: string | undefined
      let cached = false

      try {
        // Apply rate limiting if enabled
        if (enableRateLimit && serviceOptions?.userId) {
          const rateLimited = checkRateLimit(
            serviceOptions.userId,
            maxRequestsPerMinute
          )
          if (rateLimited) {
            errorCode = 'RATE_LIMITED'
            throw new Error('Rate limit exceeded')
          }
        }

        // Check cache first
        const cachedResponse = responseCache.get(messages, serviceOptions)
        if (cachedResponse) {
          cached = true

          const endTime = Date.now()
          await collectMetrics({
            requestId: generateRequestId(),
            model: cachedResponse.model || serviceOptions?.model || 'unknown',
            startTime,
            endTime,
            latency: endTime - startTime,
            inputTokens: cachedResponse.usage?.promptTokens,
            outputTokens: cachedResponse.usage?.completionTokens,
            totalTokens: cachedResponse.usage?.totalTokens,
            success: true,
            cached: true,
            optimized: false,
          })

          return cachedResponse
        }

        // Make the actual request
        const response = await aiService.createChatCompletion(
          messages,
          serviceOptions
        )
        success = true

        // Cache the successful response
        responseCache.set(messages, serviceOptions, response)

        // Collect metrics
        const endTime = Date.now()
        await collectMetrics({
          requestId: generateRequestId(),
          model: response?.model || serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          inputTokens: response?.usage?.promptTokens,
          outputTokens: response?.usage?.completionTokens,
          totalTokens: response?.usage?.totalTokens,
          success,
          cached,
          optimized: false,
        })

        return response
      } catch (error) {
        // Collect error metrics
        const endTime = Date.now()
        errorCode =
          error instanceof Error
            ? error?.name === 'AIError'
              ? (error as any).code
              : error?.name
            : 'unknown'

        await collectMetrics({
          requestId: generateRequestId(),
          model: serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          success: false,
          errorCode,
          cached,
          optimized: false,
        })

        throw error
      }
    },

    createStreamingChatCompletion: async (messages, serviceOptions) => {
      // Note: We don't cache streaming responses as they're meant for real-time use

      const startTime = Date.now()
      let success = false
      let errorCode: string | undefined

      try {
        // Make the actual request
        const response = await aiService.createStreamingChatCompletion(
          messages,
          serviceOptions
        )
        success = true

        // Collect metrics after the stream is created
        // Note: We don't have token usage for streaming responses
        const endTime = Date.now()
        await collectMetrics({
          requestId: generateRequestId(),
          model: serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          success,
        })

        return response
      } catch (error) {
        // Collect error metrics
        const endTime = Date.now()
        errorCode =
          error instanceof Error
            ? error.name === 'AIError'
              ? (error as any).code
              : error.name
            : 'unknown'

        await collectMetrics({
          requestId: generateRequestId(),
          model: serviceOptions?.model || 'unknown',
          startTime,
          endTime,
          latency: endTime - startTime,
          success: false,
          errorCode,
        })

        throw error
      }
    },

    getModelInfo: (model) => {
      return aiService.getModelInfo(model)
    },

    createChatCompletionWithTracking: async (messages, serviceOptions) => {
      return aiService.createChatCompletionWithTracking(
        messages,
        serviceOptions
      )
    },

    generateCompletion: async (
      messages: AIMessage[],
      serviceOptions?: AIServiceOptions
    ) => {
      return aiService.generateCompletion(messages, serviceOptions)
    },

    dispose: () => {
      aiService.dispose()
      responseCache.clear()
    },
  }
}

/**
 * Utility to estimate token count for a message
 * This is a rough estimate and not exact
 */
export function estimateTokenCount(text: string): number {
  // A very rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4)
}

/**
 * Utility to estimate token count for a set of messages
 */
export function estimateMessagesTokenCount(messages: AIMessage[]): number {
  // Base tokens for the messages format
  let tokenCount = 3 // Every response is primed with <|start|>assistant<|message|>

  for (const message of messages) {
    // Add tokens for message role and content
    tokenCount += 4 // Each message has a role and content field with formatting
    tokenCount += estimateTokenCount(message.content)
  }

  return tokenCount
}

/**
 * Truncates messages to fit within a token limit
 * Preserves the most recent messages and system messages
 */
export function truncateMessages(
  messages: AIMessage[],
  maxTokens: number = 4000,
  reserveTokens: number = 1000
): AIMessage[] {
  // If we don't have enough messages to worry about, return as is
  if (messages.length <= 2) return messages

  // Estimate current token count
  const estimatedTokens = estimateMessagesTokenCount(messages)

  // If we're under the limit, return as is
  if (estimatedTokens <= maxTokens - reserveTokens) return messages

  // Separate system messages from other messages
  const systemMessages = messages.filter((m) => m.role === 'system')
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  // Calculate tokens used by system messages
  const systemTokens = estimateMessagesTokenCount(systemMessages)

  // Calculate how many tokens we have left for non-system messages
  const availableTokens = maxTokens - systemTokens - reserveTokens

  // If we don't have enough tokens for any non-system messages, just return system messages
  if (availableTokens <= 0) return systemMessages

  // Start with the most recent message and work backwards
  const truncatedMessages: AIMessage[] = []
  let usedTokens = 0

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const message = nonSystemMessages[i]
    const messageTokens = estimateTokenCount(message.content) + 4 // +4 for message formatting

    if (usedTokens + messageTokens <= availableTokens) {
      truncatedMessages.unshift(message)
      usedTokens += messageTokens
    } else {
      // If this is the first message and we can't fit it completely,
      // truncate its content to fit within the limit
      if (i === nonSystemMessages.length - 1) {
        const availableForContent = availableTokens - 4 // -4 for message formatting
        if (availableForContent > 0) {
          // Truncate the content to fit within the limit
          const truncatedContent = message.content.slice(
            0,
            availableForContent * 4
          )
          truncatedMessages.unshift({
            ...message,
            content: truncatedContent,
          })
        }
      }
      break
    }
  }

  // Combine system messages with truncated non-system messages
  return [...systemMessages, ...truncatedMessages]
}
