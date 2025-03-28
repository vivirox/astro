import type {
  AICompletionResponse,
  AIError,
  AIMessage,
  AIProvider,
  AIStreamChunk,
  AIUsageRecord,
} from '../models/ai-types'
import { OpenAI } from 'openai'

/**
 * Nebius Provider Configuration
 */
export interface NebiusProviderConfig {
  apiKey?: string
  baseUrl?: string
  onUsage?: (usage: AIUsageRecord) => Promise<void>
}

/**
 * Nebius Provider Implementation
 */
export class NebiusProvider {
  private client: OpenAI
  private onUsage?: (usage: AIUsageRecord) => Promise<void>

  constructor(config: NebiusProviderConfig) {
    this.client = new OpenAI({
      baseURL: config.baseUrl || 'https://api.studio.nebius.com/v1/',
      apiKey: config.apiKey || process.env.NEBIUS_API_KEY || '',
    })
    this.onUsage = config.onUsage
  }

  async createChatCompletion(
    messages: AIMessage[],
    options?: {
      temperature?: number
      maxTokens?: number
      topP?: number
      presencePenalty?: number
      topK?: number
      stream?: boolean
    },
  ): Promise<AICompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-fast',
        messages: messages,
        max_tokens: options?.maxTokens || 512,
        temperature: options?.temperature || 0.38,
        top_p: options?.topP || 0.9,
        presence_penalty: options?.presencePenalty || 0.58,
        extra_body: {
          top_k: options?.topK || 58,
        },
        stream: options?.stream || false,
      })

      if (options?.stream) {
        return response as unknown as AICompletionResponse
      }

      const completion = response as OpenAI.Chat.Completions.ChatCompletion

      const result: AICompletionResponse = {
        id: completion.id,
        model: completion.model,
        choices: completion.choices.map((choice) => ({
          message: {
            role: choice.message.role,
            content: choice.message.content || '',
          },
          finishReason: choice.finish_reason,
        })),
        usage: completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens,
              completionTokens: completion.usage.completion_tokens,
              totalTokens: completion.usage.total_tokens,
            }
          : undefined,
      }

      if (this.onUsage && result.usage) {
        await this.onUsage({
          timestamp: Date.now(),
          model: result.model,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          id: result.id,
          provider: 'nebius' as AIProvider,
        })
      }

      return result
    } catch (error) {
      throw new Error(`Nebius API error: ${error.message}`)
    }
  }

  async createStreamingChatCompletion(
    messages: AIMessage[],
    options?: {
      temperature?: number
      maxTokens?: number
      topP?: number
      presencePenalty?: number
      topK?: number
    },
  ): Promise<AsyncIterable<AIStreamChunk>> {
    const response = await this.createChatCompletion(messages, {
      ...options,
      stream: true,
    })

    return response as unknown as AsyncIterable<AIStreamChunk>
  }

  dispose(): void {
    // Clean up any resources if needed
  }
}
