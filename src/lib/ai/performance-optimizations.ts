import type { AIService, AIMessage, AIServiceOptions } from "./models/types";
import { createAuditLog } from "../audit";
import { estimateMessagesTokenCount, truncateMessages } from "./performance";
import { db } from "../db";
import { trackPerformance } from "./performance-tracker";
import { v4 as uuidv4 } from "uuid";

/**
 * Advanced caching options
 */
export interface AdvancedCacheOptions {
  /**
   * Whether to enable caching
   */
  enabled?: boolean;

  /**
   * Time-to-live for cache entries in milliseconds
   */
  ttl?: number;

  /**
   * Maximum number of entries to store in the cache
   */
  maxEntries?: number;

  /**
   * Function to generate a cache key from messages and options
   */
  keyGenerator?: (messages: AIMessage[], options?: AIServiceOptions) => string;

  /**
   * Whether to use Redis for distributed caching
   */
  useRedis?: boolean;

  /**
   * Redis connection string (required if useRedis is true)
   */
  redisUrl?: string;

  /**
   * Redis key prefix
   */
  redisKeyPrefix?: string;

  /**
   * Whether to use tiered caching (memory + Redis)
   */
  useTieredCaching?: boolean;

  /**
   * Memory cache TTL for tiered caching (shorter than Redis TTL)
   */
  memoryTtl?: number;
}

/**
 * Request batching options
 */
export interface RequestBatchingOptions {
  /**
   * Whether to enable request batching
   */
  enabled?: boolean;

  /**
   * Maximum batch size
   */
  maxBatchSize?: number;

  /**
   * Maximum wait time for batching in milliseconds
   */
  maxWaitTime?: number;
}

/**
 * Token optimization options
 */
export interface TokenOptimizationOptions {
  /**
   * Whether to enable token optimization
   */
  enabled?: boolean;

  /**
   * Maximum tokens to use for context
   */
  maxContextTokens?: number;

  /**
   * Tokens to reserve for response
   */
  reserveTokens?: number;

  /**
   * Whether to use semantic message compression
   */
  useSemanticCompression?: boolean;

  /**
   * Whether to prioritize system messages
   */
  prioritizeSystemMessages?: boolean;

  /**
   * Whether to prioritize recent messages
   */
  prioritizeRecentMessages?: boolean;
}

/**
 * Advanced performance options
 */
export interface AdvancedPerformanceOptions {
  /**
   * Advanced caching options
   */
  caching?: AdvancedCacheOptions;

  /**
   * Request batching options
   */
  batching?: RequestBatchingOptions;

  /**
   * Token optimization options
   */
  tokenOptimization?: TokenOptimizationOptions;

  /**
   * Whether to enable adaptive model selection
   */
  enableAdaptiveModelSelection?: boolean;

  /**
   * Whether to enable request prioritization
   */
  enableRequestPrioritization?: boolean;

  /**
   * Whether to enable performance analytics
   */
  enablePerformanceAnalytics?: boolean;

  // Caching options
  enableCache?: boolean;
  cacheTTL?: number; // Time to live in seconds

  // Rate limiting options
  enableRateLimit?: boolean;
  maxRequestsPerMinute?: number;

  // Token optimization options
  maxContextLength?: number;

  // Batching options
  enableBatching?: boolean;
  batchWindow?: number; // Time window in ms to batch requests
  maxBatchSize?: number;

  // Fallback options
  enableFallback?: boolean;
  fallbackModels?: string[];

  // Tracking options
  enableDetailedTracking?: boolean;
}

/**
 * Creates a Redis client if Redis is enabled
 */
async function createRedisClient(options: AdvancedCacheOptions) {
  if (!options.useRedis) return null;

  try {
    // This is a placeholder - in a real implementation, we would use a Redis client
    // like ioredis or redis
    console.log("Creating Redis client with URL:", options.redisUrl);
    return {
      get: async (key: string) => {
        console.log(`Redis GET: ${key}`);
        return null;
      },
      set: async (key: string, value: string, ttl: number) => {
        console.log(`Redis SET: ${key}, TTL: ${ttl}ms`);
      },
      del: async (key: string) => {
        console.log(`Redis DEL: ${key}`);
      },
    };
  } catch (error) {
    console.error("Failed to create Redis client:", error);
    return null;
  }
}

/**
 * Advanced cache implementation with tiered caching support
 */
class AdvancedAICache<T> {
  private memoryCache = new Map<string, { value: T; expiresAt: number }>();
  private redisClient: any = null;
  private readonly options: Required<AdvancedCacheOptions>;

  constructor(options: AdvancedCacheOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes default
      maxEntries: options.maxEntries ?? 100,
      keyGenerator: options.keyGenerator ?? this.defaultKeyGenerator,
      useRedis: options.useRedis ?? false,
      redisUrl: options.redisUrl ?? process.env.REDIS_URL ?? "",
      redisKeyPrefix: options.redisKeyPrefix ?? "ai:cache:",
      useTieredCaching: options.useTieredCaching ?? false,
      memoryTtl: options.memoryTtl ?? 60 * 1000, // 1 minute default for memory in tiered caching
    };

    // Initialize Redis client if needed
    if (this.options.useRedis) {
      createRedisClient(this.options).then((client) => {
        this.redisClient = client;
      });
    }
  }

  /**
   * Default function to generate cache keys
   */
  private defaultKeyGenerator(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): string {
    // Create a deterministic string from messages and relevant options
    const messagesStr = JSON.stringify(messages);
    const optionsStr = options
      ? JSON.stringify({
          model: options.model,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
        })
      : "";

    return `${messagesStr}:${optionsStr}`;
  }

  /**
   * Get a value from the cache
   */
  async get(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<T | undefined> {
    if (!this.options.enabled) return undefined;

    const key = this.options.keyGenerator(messages, options);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && Date.now() < memoryEntry.expiresAt) {
      // Move the entry to the end of the map to implement LRU behavior
      this.memoryCache.delete(key);
      this.memoryCache.set(key, memoryEntry);
      return memoryEntry.value;
    }

    // If using Redis and not found in memory, check Redis
    if (this.options.useRedis && this.redisClient) {
      try {
        const redisKey = this.options.redisKeyPrefix + key;
        const redisValue = await this.redisClient.get(redisKey);

        if (redisValue) {
          const value = JSON.parse(redisValue) as T;

          // If using tiered caching, store in memory cache with shorter TTL
          if (this.options.useTieredCaching) {
            this.memoryCache.set(key, {
              value,
              expiresAt: Date.now() + this.options.memoryTtl,
            });
          }

          return value;
        }
      } catch (error) {
        console.error("Redis cache error:", error);
      }
    }

    return undefined;
  }

  /**
   * Set a value in the cache
   */
  async set(
    messages: AIMessage[],
    options: AIServiceOptions | undefined,
    value: T,
  ): Promise<void> {
    if (!this.options.enabled) return;

    const key = this.options.keyGenerator(messages, options);

    // Set in memory cache
    // Enforce max entries limit (LRU eviction)
    if (this.memoryCache.size >= this.options.maxEntries) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      value,
      expiresAt:
        Date.now() +
        (this.options.useTieredCaching
          ? this.options.memoryTtl
          : this.options.ttl),
    });

    // If using Redis, also set in Redis
    if (this.options.useRedis && this.redisClient) {
      try {
        const redisKey = this.options.redisKeyPrefix + key;
        await this.redisClient.set(
          redisKey,
          JSON.stringify(value),
          this.options.ttl,
        );
      } catch (error) {
        console.error("Redis cache error:", error);
      }
    }
  }

  /**
   * Clear the cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    // If using Redis, clear Redis cache as well
    if (this.options.useRedis && this.redisClient) {
      try {
        // In a real implementation, we would use a pattern to delete all keys with the prefix
        console.log(
          `Clearing Redis cache with prefix: ${this.options.redisKeyPrefix}`,
        );
      } catch (error) {
        console.error("Redis cache error:", error);
      }
    }
  }

  /**
   * Get the current size of the memory cache
   */
  size(): number {
    return this.memoryCache.size;
  }
}

/**
 * Request batch for batching similar requests
 */
class RequestBatch<T> {
  private requests: Array<{
    messages: AIMessage[];
    options?: AIServiceOptions;
    resolve: (value: T) => void;
    reject: (error: any) => void;
  }> = [];
  private timer: NodeJS.Timeout | null = null;
  private readonly options: Required<RequestBatchingOptions>;

  constructor(options: RequestBatchingOptions = {}) {
    this.options = {
      enabled: options.enabled ?? false,
      maxBatchSize: options.maxBatchSize ?? 5,
      maxWaitTime: options.maxWaitTime ?? 100, // 100ms default
    };
  }

  /**
   * Add a request to the batch
   */
  add(
    messages: AIMessage[],
    options: AIServiceOptions | undefined,
    resolve: (value: T) => void,
    reject: (error: any) => void,
  ): void {
    if (!this.options.enabled) {
      reject(new Error("Request batching is not enabled"));
      return;
    }

    this.requests.push({ messages, options, resolve, reject });

    // If this is the first request, start the timer
    if (this.requests.length === 1) {
      this.timer = setTimeout(() => this.flush(), this.options.maxWaitTime);
    }

    // If we've reached the max batch size, flush immediately
    if (this.requests.length >= this.options.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Process all requests in the batch
   */
  private flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // In a real implementation, we would batch the requests and send them to the AI service
    // For now, we'll just reject all requests with a not implemented error
    const requests = [...this.requests];
    this.requests = [];

    for (const request of requests) {
      request.reject(new Error("Request batching is not implemented yet"));
    }
  }
}

/**
 * Semantic message compression for token optimization
 */
function compressMessages(
  messages: AIMessage[],
  maxTokens: number,
): AIMessage[] {
  // This is a placeholder for a more sophisticated implementation
  // In a real implementation, we would use an embedding model to compress messages
  // while preserving semantic meaning

  // For now, we'll just use the truncateMessages function
  return truncateMessages(messages, maxTokens);
}

/**
 * Creates an advanced performance-optimized AI service
 */
export function createAdvancedOptimizedAIService(
  aiService: AIService,
  options: AdvancedPerformanceOptions = {},
): AIService {
  const {
    enableCache = true,
    cacheTTL = 3600, // 1 hour default
    enableRateLimit = true,
    maxRequestsPerMinute = 100,
    enableTokenOptimization = true,
    maxContextLength = 4000,
    enableBatching = false,
    batchWindow = 50,
    maxBatchSize = 5,
    enableFallback = true,
    fallbackModels = [],
    enableDetailedTracking = true,
  } = options;

  // Initialize caching
  const cacheOptions = options.caching ?? {};
  const cache = new AdvancedAICache<
    Awaited<ReturnType<AIService["createChatCompletion"]>>
  >(cacheOptions);

  // Initialize request batching
  const batchingOptions = options.batching ?? {};
  const batch = new RequestBatch<
    Awaited<ReturnType<AIService["createChatCompletion"]>>
  >(batchingOptions);

  // Initialize token optimization
  const tokenOptions = options.tokenOptimization ?? {};
  const tokenOptimizationEnabled = tokenOptions.enabled ?? true;
  const maxContextTokens = tokenOptions.maxContextTokens ?? 4000;
  const reserveTokens = tokenOptions.reserveTokens ?? 1000;
  const useSemanticCompression = tokenOptions.useSemanticCompression ?? false;

  // Initialize adaptive model selection
  const adaptiveModelSelectionEnabled =
    options.enableAdaptiveModelSelection ?? false;

  // Initialize performance analytics
  const performanceAnalyticsEnabled =
    options.enablePerformanceAnalytics ?? true;

  // In-memory cache for simplicity (in production, use Redis or similar)
  const responseCache = new Map<
    string,
    { response: AICompletionResponse; expires: number }
  >();

  // Rate limiting tracking
  const rateLimitTracker = new Map<
    string,
    { count: number; resetTime: number }
  >();

  // Batch queue for request batching
  let batchQueue: {
    request: AICompletionRequest;
    resolve: (value: AICompletionResponse) => void;
    reject: (reason: any) => void;
  }[] = [];
  let batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Track performance metrics
   */
  async function trackPerformance(metrics: {
    model: string;
    latency: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    success: boolean;
    errorCode?: string;
    cached?: boolean;
    optimized?: boolean;
  }): Promise<void> {
    if (!performanceAnalyticsEnabled) return;

    try {
      // Log to console
      console.log("[AI Performance]", {
        model: metrics.model,
        latency: `${metrics.latency}ms`,
        tokens: metrics.totalTokens,
        success: metrics.success,
        cached: metrics.cached,
        optimized: metrics.optimized,
      });

      // Create audit log
      await createAuditLog({
        action: "ai.request",
        category: "ai",
        status: metrics.success ? "success" : "error",
        details: {
          model: metrics.model,
          latency: metrics.latency,
          inputTokens: metrics.inputTokens,
          outputTokens: metrics.outputTokens,
          totalTokens: metrics.totalTokens,
          errorCode: metrics.errorCode,
          cached: metrics.cached,
          optimized: metrics.optimized,
        },
      });

      // Store in database for analytics
      if (db) {
        await db.insert("ai_performance_metrics", {
          model: metrics.model,
          latency: metrics.latency,
          input_tokens: metrics.inputTokens,
          output_tokens: metrics.outputTokens,
          total_tokens: metrics.totalTokens,
          success: metrics.success,
          error_code: metrics.errorCode,
          cached: metrics.cached ? 1 : 0,
          optimized: metrics.optimized ? 1 : 0,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error("Failed to track performance metrics:", error);
    }
  }

  /**
   * Select the optimal model based on the request
   */
  function selectOptimalModel(
    messages: AIMessage[],
    requestedModel: string,
  ): string {
    if (!adaptiveModelSelectionEnabled) return requestedModel;

    // This is a placeholder for a more sophisticated implementation
    // In a real implementation, we would analyze the messages and select the most
    // appropriate model based on complexity, length, etc.

    // For now, we'll just return the requested model
    return requestedModel;
  }

  /**
   * Optimize messages for token usage
   */
  function optimizeMessages(
    messages: AIMessage[],
    model: string,
  ): { messages: AIMessage[]; optimized: boolean } {
    if (!tokenOptimizationEnabled) return { messages, optimized: false };

    // Estimate token count
    const estimatedTokens = estimateMessagesTokenCount(messages);

    // If we're under the limit, return as is
    if (estimatedTokens <= maxContextTokens - reserveTokens) {
      return { messages, optimized: false };
    }

    // Use semantic compression if enabled, otherwise use truncation
    const optimizedMessages = useSemanticCompression
      ? compressMessages(messages, maxContextTokens - reserveTokens)
      : truncateMessages(messages, maxContextTokens, reserveTokens);

    return { messages: optimizedMessages, optimized: true };
  }

  return {
    createChatCompletion: async (messages, serviceOptions) => {
      const startTime = Date.now();
      let success = false;
      let errorCode: string | undefined;
      let cached = false;
      let optimized = false;

      try {
        // Apply rate limiting if enabled
        if (enableRateLimit && serviceOptions?.userId) {
          const rateLimited = checkRateLimit(
            serviceOptions.userId,
            maxRequestsPerMinute,
          );
          if (rateLimited) {
            errorCode = "RATE_LIMITED";
            throw new Error("Rate limit exceeded");
          }
        }

        // Check cache first
        const cachedResponse = await cache.get(messages, serviceOptions);
        if (cachedResponse) {
          cached = true;

          // Track performance for cached response
          const endTime = Date.now();
          await trackPerformance({
            model: cachedResponse.model || serviceOptions?.model || "unknown",
            latency: endTime - startTime,
            inputTokens: cachedResponse.usage?.prompt_tokens,
            outputTokens: cachedResponse.usage?.completion_tokens,
            totalTokens: cachedResponse.usage?.total_tokens,
            success: true,
            cached: true,
            optimized: false,
          });

          return cachedResponse;
        }

        // Select optimal model
        const model = selectOptimalModel(
          messages,
          serviceOptions?.model || "gpt-4o",
        );

        // Optimize messages for token usage
        const { messages: optimizedMessages, optimized: messagesOptimized } =
          optimizeMessages(messages, model);
        optimized = messagesOptimized;

        // Make the actual request with optimized messages and model
        const response = await aiService.createChatCompletion(
          optimizedMessages,
          { ...serviceOptions, model },
        );

        success = true;

        // Cache the successful response
        await cache.set(messages, serviceOptions, response);

        // Track performance
        const endTime = Date.now();
        await trackPerformance({
          model: response.model || model,
          latency: endTime - startTime,
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
          success: true,
          cached: false,
          optimized,
        });

        return response;
      } catch (error) {
        // Track error performance
        const endTime = Date.now();
        errorCode = error instanceof Error ? error.name : "unknown";

        await trackPerformance({
          model: serviceOptions?.model || "unknown",
          latency: endTime - startTime,
          success: false,
          errorCode,
          cached,
          optimized,
        });

        throw error;
      }
    },

    createStreamingChatCompletion: async (messages, serviceOptions) => {
      const startTime = Date.now();
      let success = false;
      let errorCode: string | undefined;
      let optimized = false;

      try {
        // Select optimal model
        const model = selectOptimalModel(
          messages,
          serviceOptions?.model || "gpt-4o",
        );

        // Optimize messages for token usage
        const { messages: optimizedMessages, optimized: messagesOptimized } =
          optimizeMessages(messages, model);
        optimized = messagesOptimized;

        // Make the actual request with optimized messages and model
        const response = await aiService.createStreamingChatCompletion(
          optimizedMessages,
          { ...serviceOptions, model },
        );

        success = true;

        // Track performance
        const endTime = Date.now();
        await trackPerformance({
          model: response.model || model,
          latency: endTime - startTime,
          success: true,
          cached: false,
          optimized,
        });

        return response;
      } catch (error) {
        // Track error performance
        const endTime = Date.now();
        errorCode = error instanceof Error ? error.name : "unknown";

        await trackPerformance({
          model: serviceOptions?.model || "unknown",
          latency: endTime - startTime,
          success: false,
          errorCode,
          cached: false,
          optimized,
        });

        throw error;
      }
    },

    getModelInfo: (model) => {
      return aiService.getModelInfo(model);
    },

    async complete(
      request: AICompletionRequest,
    ): Promise<AICompletionResponse> {
      const startTime = Date.now();
      const requestId = uuidv4();
      let isCached = false;
      let isOptimized = false;
      let success = true;
      let errorCode: string | undefined;

      try {
        // Apply rate limiting if enabled
        if (enableRateLimit && request.userId) {
          const rateLimited = checkRateLimit(
            request.userId,
            maxRequestsPerMinute,
          );
          if (rateLimited) {
            errorCode = "RATE_LIMITED";
            throw new Error("Rate limit exceeded");
          }
        }

        // Check cache if enabled
        if (enableCache) {
          const cachedResponse = checkCache(request, cacheTTL);
          if (cachedResponse) {
            isCached = true;

            // Track performance for cached response
            if (enableDetailedTracking) {
              trackPerformance({
                model: request.model,
                latency: Date.now() - startTime,
                input_tokens: request.messages.reduce(
                  (acc, msg) => acc + msg.content.length / 4,
                  0,
                ), // Rough estimate
                output_tokens: cachedResponse.content.length / 4, // Rough estimate
                total_tokens:
                  request.messages.reduce(
                    (acc, msg) => acc + msg.content.length / 4,
                    0,
                  ) +
                  cachedResponse.content.length / 4,
                success: true,
                cached: true,
                optimized: false,
                user_id: request.userId,
                session_id: request.sessionId,
                request_id: requestId,
              });
            }

            return cachedResponse;
          }
        }

        // Apply token optimization if enabled
        let optimizedRequest = { ...request };
        if (enableTokenOptimization && request.messages.length > 1) {
          optimizedRequest = optimizeTokens(request, maxContextLength);
          isOptimized = optimizedRequest !== request;
        }

        // Handle batching if enabled
        if (enableBatching && !request.stream) {
          return new Promise((resolve, reject) => {
            batchQueue.push({ request: optimizedRequest, resolve, reject });

            if (!batchTimeout && batchQueue.length < maxBatchSize) {
              batchTimeout = setTimeout(
                () => processBatch(aiService),
                batchWindow,
              );
            } else if (batchQueue.length >= maxBatchSize) {
              clearTimeout(batchTimeout!);
              batchTimeout = null;
              processBatch(aiService);
            }
          });
        }

        // Normal request processing
        const response = await aiService.complete(optimizedRequest);

        // Cache the response if caching is enabled
        if (enableCache && !request.stream) {
          cacheResponse(request, response, cacheTTL);
        }

        // Track performance
        if (enableDetailedTracking) {
          trackPerformance({
            model: request.model,
            latency: Date.now() - startTime,
            input_tokens: response.usage?.prompt_tokens || 0,
            output_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
            success: true,
            cached: isCached,
            optimized: isOptimized,
            user_id: request.userId,
            session_id: request.sessionId,
            request_id: requestId,
          });
        }

        return response;
      } catch (error) {
        success = false;
        errorCode = errorCode || "SERVICE_ERROR";

        // Try fallback models if enabled
        if (enableFallback && fallbackModels.length > 0) {
          for (const fallbackModel of fallbackModels) {
            try {
              const fallbackResponse = await aiService.complete({
                ...request,
                model: fallbackModel,
              });

              // Track fallback performance
              if (enableDetailedTracking) {
                trackPerformance({
                  model: fallbackModel,
                  latency: Date.now() - startTime,
                  input_tokens: fallbackResponse.usage?.prompt_tokens || 0,
                  output_tokens: fallbackResponse.usage?.completion_tokens || 0,
                  total_tokens: fallbackResponse.usage?.total_tokens || 0,
                  success: true,
                  cached: false,
                  optimized: isOptimized,
                  user_id: request.userId,
                  session_id: request.sessionId,
                  request_id: requestId,
                });
              }

              return fallbackResponse;
            } catch (fallbackError) {
              // Continue to next fallback model
            }
          }
        }

        // Track failed performance
        if (enableDetailedTracking) {
          trackPerformance({
            model: request.model,
            latency: Date.now() - startTime,
            input_tokens: request.messages.reduce(
              (acc, msg) => acc + msg.content.length / 4,
              0,
            ), // Rough estimate
            output_tokens: 0,
            total_tokens: request.messages.reduce(
              (acc, msg) => acc + msg.content.length / 4,
              0,
            ),
            success: false,
            error_code: errorCode,
            cached: isCached,
            optimized: isOptimized,
            user_id: request.userId,
            session_id: request.sessionId,
            request_id: requestId,
          });
        }

        throw error;
      }
    },
  };
}

/**
 * Check if a response is in the cache
 */
function checkCache(
  request: AICompletionRequest,
  cacheTTL: number,
): AICompletionResponse | null {
  // Skip cache for streaming requests
  if (request.stream) return null;

  // Generate cache key from request
  const cacheKey = generateCacheKey(request);
  const cached = responseCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.response;
  }

  // Clean up expired cache entries
  if (cached && cached.expires <= Date.now()) {
    responseCache.delete(cacheKey);
  }

  return null;
}

/**
 * Cache a response
 */
function cacheResponse(
  request: AICompletionRequest,
  response: AICompletionResponse,
  cacheTTL: number,
): void {
  // Skip caching for streaming responses
  if (request.stream) return;

  const cacheKey = generateCacheKey(request);
  responseCache.set(cacheKey, {
    response,
    expires: Date.now() + cacheTTL * 1000,
  });
}

/**
 * Generate a cache key from a request
 */
function generateCacheKey(request: AICompletionRequest): string {
  // Create a deterministic key from the request
  return JSON.stringify({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
  });
}

/**
 * Check if a user has exceeded rate limits
 */
function checkRateLimit(userId: string, maxRequestsPerMinute: number): boolean {
  const now = Date.now();
  const resetTime = Math.floor(now / 60000) * 60000 + 60000; // Next minute boundary

  const userRateLimit = rateLimitTracker.get(userId) || { count: 0, resetTime };

  // Reset counter if we're in a new minute
  if (now >= userRateLimit.resetTime) {
    userRateLimit.count = 1;
    userRateLimit.resetTime = resetTime;
    rateLimitTracker.set(userId, userRateLimit);
    return false;
  }

  // Increment counter and check limit
  userRateLimit.count++;
  rateLimitTracker.set(userId, userRateLimit);

  return userRateLimit.count > maxRequestsPerMinute;
}

/**
 * Optimize tokens by truncating or summarizing context
 */
function optimizeTokens(
  request: AICompletionRequest,
  maxContextLength: number,
): AICompletionRequest {
  // Simple optimization: if too many messages, keep the first one (system prompt)
  // and the most recent ones up to a token limit
  if (request.messages.length <= 2) return request;

  const systemMessage =
    request.messages[0].role === "system" ? request.messages[0] : null;
  const messages = systemMessage ? request.messages.slice(1) : request.messages;

  // Rough token estimation (4 chars ≈ 1 token)
  let tokenCount = 0;
  const optimizedMessages = [];

  // Always include system message if present
  if (systemMessage) {
    optimizedMessages.push(systemMessage);
    tokenCount += Math.ceil(systemMessage.content.length / 4);
  }

  // Add messages from newest to oldest until we hit the limit
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = Math.ceil(message.content.length / 4);

    if (tokenCount + messageTokens <= maxContextLength) {
      optimizedMessages.unshift(message);
      tokenCount += messageTokens;
    } else {
      // If we can't fit the whole message, we're done
      break;
    }
  }

  return {
    ...request,
    messages: optimizedMessages,
  };
}

/**
 * Process a batch of requests
 */
async function processBatch(service: AIService): Promise<void> {
  const batch = batchQueue;
  batchQueue = [];
  batchTimeout = null;

  if (batch.length === 0) return;

  // Group requests by model
  const requestsByModel: Record<string, typeof batch> = {};

  for (const item of batch) {
    const model = item.request.model;
    if (!requestsByModel[model]) {
      requestsByModel[model] = [];
    }
    requestsByModel[model].push(item);
  }

  // Process each model's requests
  for (const [model, requests] of Object.entries(requestsByModel)) {
    try {
      // For simplicity, we're just processing them sequentially
      // In a real implementation, you might want to use the batch API if available
      for (const { request, resolve, reject } of requests) {
        try {
          const response = await service.complete(request);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }
    } catch (error) {
      // If batch processing fails, reject all requests
      for (const { reject } of requests) {
        reject(error);
      }
    }
  }
}
