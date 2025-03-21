import { createTogetherAIService } from './services/together'
import type {
  AIService,
  AICompletionResponse as TypesAICompletionResponse,
} from './models/ai-types'
import {
  createAdvancedOptimizedAIService,
  type AdvancedPerformanceOptions,
} from './performance-optimizations'
import type { AIMessage, AICompletionResponse } from './models/ai-types'
import type { AIServiceOptions } from './models/ai-types'

export type AIServiceFactoryOptions = {
  provider: 'together'
  apiKey?: string
  baseUrl?: string
  enableOptimization?: boolean
  enableAdvancedOptimization?: boolean
  advancedPerformanceOptions?: AdvancedPerformanceOptions
}

/**
 * Creates a base AI service by simply returning the TogetherAI service.
 */
function createBaseAIService(apiKey: string): AIService {
  return createTogetherAIService({
    apiKey,
    togetherApiKey: apiKey,
  }) as unknown as AIService
}

/**
 * Creates an enhanced AI service with tracking capabilities.
 */
function createEnhancedAIService(apiKey: string): AIService {
  const baseService = createBaseAIService(apiKey)
  return {
    ...baseService,
    createChatCompletionWithTracking: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ): Promise<TypesAICompletionResponse> => {
      const response = await baseService.createChatCompletion(messages, options)

      // Create a properly typed response
      const typedResponse: TypesAICompletionResponse = {
        id: response?.id,
        model: response?.model,
        created: response?.created,
        content: response?.content,
        choices: (response?.choices?.map((choice) => ({
          message: choice.message
            ? {
                role: (choice.message.role || 'assistant') as
                  | 'system'
                  | 'user'
                  | 'assistant',
                content: choice.message.content || '',
                name: choice.message.name || '', // Provide default empty string to satisfy type constrain
              }
            : undefined,
          finishReason: choice.finishReason,
        })) || []) as TypesAICompletionResponse['choices'],
        provider: 'openai',
      }
      if (response?.usage) {
        typedResponse.usage = response?.usage
      }
      return typedResponse
    },
  }
}

/**
 * Create an AI service using the provided options.
 */
export function createAIService(
  options: AIServiceFactoryOptions = { provider: 'together' }
): AIService {
  if (!options.apiKey) {
    throw new Error('API key is required for TogetherAI provider')
  }

  // Create base service
  const baseService = createBaseAIService(options.apiKey)

  // Apply advanced optimizations if enabled
  if (options.enableAdvancedOptimization) {
    // Convert to unknown first, then to the desired type
    const optimizedService = createAdvancedOptimizedAIService(
      baseService as unknown as import('./models/ai-types').AIService,
      options.advancedPerformanceOptions
    )
    return optimizedService as unknown as AIService
  }
  // Apply standard optimizations (enabled by default)
  else if (options.enableOptimization !== false) {
    // Convert to unknown first, then to the desired type
    const optimizedService = createAdvancedOptimizedAIService(
      baseService as unknown as import('./models/ai-types').AIService,
      {
        enableCache: true,
        cacheTTL: 3600,
        enableRateLimit: true,
        maxRequestsPerMinute: 100,
        tokenOptimization: {
          enabled: true,
        },
        maxContextLength: 4000,
      }
    )
    return optimizedService as unknown as AIService
  }

  // Return the base service without optimizations
  return baseService
}
