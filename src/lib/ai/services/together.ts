import type { ReadableStream } from 'node:stream/web'
import type {
  AIService,
  AIServiceResponse,
  AIMessage,
  AIServiceOptions,
  AICompletionResponse,
  AIStreamChunk,
  AIUsageRecord,
  AIProvider,
} from '../models/ai-types'

// TogetherAI API configuration
interface TogetherAIConfig {
  togetherApiKey: string
  togetherBaseUrl?: string
  onUsage?: (usage: AIUsageRecord) => Promise<void>
  apiKey: string
}

// TogetherAI service interface
export interface TogetherAIService extends AIService {
  generateCompletion(
    messages: AIMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
      stop?: string[]
    }
  ): Promise<AIServiceResponse>
}

/**
 * Create a TogetherAI service
 * @param config The TogetherAI configuration
 * @returns A TogetherAI service
 */
export function createTogetherAIService(
  config: TogetherAIConfig
): TogetherAIService {
  const baseUrl = config.togetherBaseUrl || 'https://api.together.xyz/v1'
  const apiKey = config.apiKey || config.togetherApiKey

  if (!apiKey) {
    throw new Error('TogetherAI API key is required')
  }

  async function generateCompletion(
    messages: AIMessage[],
    options: AIServiceOptions = {}
  ): Promise<AICompletionResponse> {
    try {
      const {
        model = 'mistralai/Mixtral-8x7B-Instruct-v0.2',
        temperature = 0.7,
        maxTokens = 1000,
      } = options

      // Format messages for TogetherAI API
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name || 'default_name',
      }))

      // Make API request
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response?.ok) {
        const error = await response?.json()
        throw new Error(
          `TogetherAI API error: ${error.error?.message || response.statusText}`
        )
      }

      const data = await response?.json()

      // Return formatted response
      return {
        id: data?.id || `together_${Date.now()}`,
        model: data?.model || model,
        created: Date.now(),
        content: data?.choices[0].message.content,
        choices: [
          {
            message: {
              role: 'assistant',
              content: data?.choices[0].message.content,
              name: 'assistant',
            },
            finishReason: data?.choices[0].finish_reason || 'stop',
          },
        ],
        usage: {
          promptTokens: data?.usage?.prompt_tokens || 0,
          completionTokens: data?.usage?.completion_tokens || 0,
          totalTokens: data?.usage?.total_tokens || 0,
        },
        provider: 'together' as AIProvider,
      }
    } catch (error) {
      console.error('Error generating completion:', error)
      throw error
    }
  }

  // Define the service object to return
  return {
    // Required methods for AIService interface
    generateCompletion: async (
      messages: AIMessage[],
      options?: {
        model?: string
        temperature?: number
        maxTokens?: number
        stop?: string[]
      }
    ): Promise<AIServiceResponse> => {
      const response = await generateCompletion(messages, options)
      return {
        content: response?.content,
        model: response?.model,
        usage: response?.usage
          ? {
              promptTokens: response?.usage.promptTokens || 0,
              completionTokens: response?.usage.completionTokens || 0,
              totalTokens: response?.usage.totalTokens || 0,
            }
          : undefined,
      }
    },
    createChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ): Promise<AICompletionResponse> => {
      return generateCompletion(messages, options)
    },

    createStreamingChatCompletion: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ): Promise<ReadableStream<AIStreamChunk>> => {
      throw new Error('Streaming not supported yet')
    },

    getModelInfo: (model: string): any => {
      return {
        id: model,
        capabilities: ['chat'],
      }
    },

    createChatCompletionWithTracking: async (
      messages: AIMessage[],
      options?: AIServiceOptions
    ): Promise<AICompletionResponse> => {
      const response = await generateCompletion(messages, options)
      if (config.onUsage && response?.usage) {
        await config.onUsage({
          timestamp: Date.now(),
          model: response?.model,
          promptTokens: response?.usage.promptTokens || 0,
          completionTokens: response?.usage.completionTokens || 0,
          totalTokens: response?.usage.totalTokens || 0,
          id: response?.id,
          provider: 'together' as AIProvider,
        })
      }
      return response
    },
    dispose: () => {
      // Dispose resources if needed
    },
  }
}
