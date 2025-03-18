import type { 
  AICompletionRequest, 
  AICompletionResponse, 
  AIMessage, 
  AIStreamChunk,
  AIError,
  AIProvider,
  AIUsageRecord
} from '../models/ai-types';
import { TogetherAIProvider, type TogetherAIProviderConfig } from '../providers/together';
import { getModelById, getDefaultModelForCapability } from '../models/registry';
import { AICacheService, type CacheConfig } from './cache-service';
import { PromptOptimizerService, type PromptOptimizerConfig } from './prompt-optimizer';
import { ConnectionPoolManager, type ConnectionPoolConfig } from './connection-pool';
import { FallbackService, type FallbackServiceConfig } from './fallback-service';

/**
 * AI Service Configuration
 */
export interface AIServiceConfig {
  together?: TogetherAIProviderConfig;
  cache?: CacheConfig;
  promptOptimizer?: PromptOptimizerConfig;
  connectionPool?: ConnectionPoolConfig;
  fallback?: FallbackServiceConfig;
  onUsage?: (usage: AIUsageRecord) => Promise<void>;
}

/**
 * AI Service Implementation
 * 
 * This service provides a unified interface to TogetherAI with performance optimizations
 */
export class AIService {
  private togetherProvider: TogetherAIProvider;
  private cacheService: AICacheService;
  private promptOptimizer: PromptOptimizerService;
  private connectionPool: ConnectionPoolManager;
  private fallbackService: FallbackService;
  private onUsage?: (usage: AIUsageRecord) => Promise<void>;

  constructor(config: AIServiceConfig = {}) {
    // Initialize services
    this.cacheService = new AICacheService(config.cache);
    this.promptOptimizer = new PromptOptimizerService(config.promptOptimizer);
    this.connectionPool = new ConnectionPoolManager(config.connectionPool);
    this.fallbackService = new FallbackService(config.fallback);
    
    // Initialize TogetherAI provider with connection pool
    this.togetherProvider = new TogetherAIProvider({
      ...config.together,
      connectionPool: this.connectionPool
    });
    
    // Set usage callback
    this.onUsage = config.onUsage;
  }

  /**
   * Create a chat completion with performance optimizations
   */
  async createChatCompletion(
    messages: AIMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<AICompletionResponse> {
    const model = options.model || getDefaultModelForCapability('chat').id;
    const modelInfo = getModelById(model);

    if (!modelInfo) {
      throw new Error(`Model not found: ${model}`);
    }

    // Prepare the request
    const request: AICompletionRequest = {
      messages,
      model: modelInfo.togetherModelId || model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: options.stream
    };

    try {
      // Step 1: Optimize the prompt to reduce token usage
      const optimizedMessages = this.promptOptimizer.optimizeMessages(messages);
      request.messages = optimizedMessages;

      // Step 2: Check cache for non-streaming requests
      if (!options.stream && !options.skipCache) {
        const cachedResponse = this.cacheService.get(request);
        if (cachedResponse) {
          // Track usage from cache hit
          this.trackUsage({
            ...cachedResponse.usage,
            provider: 'cache',
            timestamp: new Date().toISOString()
          });
          
          return cachedResponse;
        }
      }

      // Step 3: Use fallback service with retry logic
      const response = await this.fallbackService.withRetry(
        async () => {
          // Use TogetherAI provider for all models
          return this.togetherProvider.createChatCompletion(optimizedMessages, {
            ...options,
            model: modelInfo.togetherModelId || model
          });
        },
        {
          onRetry: (attempt, error) => {
            console.warn(`Retry attempt ${attempt} for AI request: ${error.message}`);
          }
        }
      );

      // Step 4: Cache the response for future use (non-streaming only)
      if (!options.stream) {
        this.cacheService.set(request, response);
      }

      // Step 5: Track usage
      if (response.usage) {
        this.trackUsage(response.usage);
      }

      return response;
    } catch (error) {
      // Generate fallback response if all retries failed
      const aiError = error as AIError;
      const fallbackResponse = this.fallbackService.generateFallbackResponse(request, aiError);
      
      if (fallbackResponse) {
        // Track fallback usage
        if (fallbackResponse.usage) {
          this.trackUsage(fallbackResponse.usage);
        }
        
        return fallbackResponse;
      }
      
      // Re-throw if no fallback
      throw error;
    }
  }
  
  /**
   * Create a streaming chat completion
   */
  async createStreamingChatCompletion(
    messages: AIMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ) {
    return this.createChatCompletion(messages, {
      ...options,
      stream: true
    });
  }
  
  /**
   * Track usage statistics
   */
  private async trackUsage(usage: AIUsageRecord): Promise<void> {
    try {
      if (this.onUsage) {
        await this.onUsage(usage);
      }
    } catch (error) {
      console.error('Error tracking AI usage:', error);
    }
  }
  
  /**
   * Get performance statistics
   */
  getStats() {
    return {
      cache: this.cacheService.getStats(),
      connectionPool: this.connectionPool.getStats(),
      promptOptimizer: this.promptOptimizer.getStats()
    };
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    this.connectionPool.dispose();
  }
} 