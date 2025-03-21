import { ReadableStream } from 'node:stream/web'
import type {
  AIProvider,
  AICompletionResponse,
  AIMessage,
  AIStreamChunk,
  AIError,
  AIUsageRecord,
} from '../models/ai-types'
import { ConnectionPoolManager } from '../services/connection-pool'

/**
 * TogetherAI Provider Configuration
 */
export interface TogetherAIProviderConfig {
  apiKey?: string
  baseUrl?: string
  connectionPool?: ConnectionPoolManager
}

/**
 * TogetherAI Provider Implementation
 */
export class TogetherAIProvider {
  private apiKey: string
  private baseUrl: string
  private connectionPool?: ConnectionPoolManager

  constructor(config: TogetherAIProviderConfig) {
    this.apiKey = config.apiKey || process.env.TOGETHER_API_KEY || ''
    this.baseUrl = config.baseUrl || 'https://api.together.xyz'
    this.connectionPool = config.connectionPool
  }

  /**
   * Create a chat completion using TogetherAI
   */
  async generateCompletion(
    messages: AIMessage[],
    options: {
      model: string
      temperature?: number
      maxTokens?: number
      stream?: boolean
    },
    provider: AIProvider
  ): Promise<AICompletionResponse | ReadableStream<AIStreamChunk>> {
    try {
      const { model, temperature = 0.7, maxTokens, stream = false } = options

      // Format messages for TogetherAI API
      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name || 'default_name',
      }))

      // Prepare request body
      const body: Record<string, any> = {
        model,
        messages: formattedMessages,
        temperature,
        stream,
      }

      // Add max_tokens if provided
      if (maxTokens) {
        body.max_tokens = maxTokens
      }

      // Get connection from pool if available
      const { controller, headers: connectionHeaders } = this.connectionPool
        ? this.connectionPool.getConnection()
        : { controller: new AbortController(), headers: {} }

      // Make API request with connection pooling
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...connectionHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      // Get connection ID for release
      const connectionId = connectionHeaders['X-Connection-Id']

      if (!response?.ok) {
        // Release connection on error
        if (this.connectionPool && connectionId) {
          this.connectionPool.releaseConnection(connectionId)
        }

        const errorData = await response?.json().catch(() => ({}))
        throw new Error(
          `TogetherAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        )
      }

      // Handle streaming response
      if (stream) {
        // Start stream handling in background
        this.processStreamResponse(response, model, connectionId)

        // Return initial response
        const completionResponse: AICompletionResponse = {
          id: `together-${Date.now()}`,
          model,
          created: Date.now(),
          content: '',
          choices: [],
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
          provider,
        }
        return completionResponse as
          | AICompletionResponse
          | ReadableStream<AIStreamChunk>
      }

      // Handle regular response
      const data = await response?.json()

      // Release connection after use
      if (this.connectionPool && connectionId) {
        this.connectionPool.releaseConnection(connectionId)
      }

      // Calculate token usage
      const usage: AIUsageRecord = {
        model,
        promptTokens: data?.usage?.prompt_tokens || 0,
        completionTokens: data?.usage?.completion_tokens || 0,
        totalTokens: data?.usage?.total_tokens || 0,
        timestamp: Date.now(),
        id: `usage-${Date.now()}`,
        provider,
      }

      return {
        id: data?.id || `together-${Date.now()}`,
        model,
        created: Date.now(),
        content: data?.choices[0]?.message?.content || '',
        choices: [
          {
            message: {
              role: 'assistant',
              content: data?.choices[0]?.message?.content || '',
              name: 'together_assistant',
            },
            finishReason: data?.choices[0]?.finish_reason || null,
          },
        ],
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
        provider,
      }
    } catch (error) {
      const aiError: AIError = {
        message: error instanceof Error ? error?.message : String(error),
        type: 'provider_error',
        param: null,
        code: 500,
      }
      throw aiError
    }
  }
  /**
   * Handle streaming response from TogetherAI
   */
  private async *handleStream(
    response: Response,
    model: string,
    connectionId?: string
  ): AsyncGenerator<AIStreamChunk> {
    if (!response?.body) {
      // Release connection if no body
      if (this.connectionPool && connectionId) {
        this.connectionPool.releaseConnection(connectionId)
      }
      throw new Error('Response body is null')
    }

    const reader = response?.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let promptTokens = 0
    let completionTokens = 0

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue
          if (!line.startsWith('data: ')) continue

          const data = line.slice(5).trim()
          if (data === '[DONE]') continue

          try {
            const json = JSON.parse(data)
            const delta = json.choices[0]?.delta
            const finishReason = json.choices[0]?.finish_reason

            if (delta?.content) {
              completionTokens += 1 // Approximate token count

              yield {
                id: `together-${Date.now()}`,
                model,
                created: Date.now(),
                content: delta.content,
                choices: [
                  {
                    delta: {
                      content: delta.content,
                    },
                    finishReason: finishReason || null,
                  },
                ],
              }
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error)
      throw error
    } finally {
      // Release connection when done
      if (this.connectionPool && connectionId) {
        this.connectionPool.releaseConnection(connectionId)
      }

      // Final usage record
      const totalTokens = promptTokens + completionTokens

      yield {
        id: `together-${Date.now()}`,
        model,
        created: Date.now(),
        content: '',
        choices: [
          {
            delta: {
              content: '',
            },
            finishReason: 'stop',
          },
        ],
      }
    }
  }

  /**
   * Process streaming response in background
   */
  private async processStreamResponse(
    response: Response,
    model: string,
    connectionId?: string
  ): Promise<void> {
    try {
      const streamGenerator = this.handleStream(response, model, connectionId)
      for await (const chunk of streamGenerator) {
        // Process chunk (e.g., send to client via WebSocket or SSE)
        // This would be implemented by the consumer of this library
      }
    } catch (error) {
      console.error('Error processing stream:', error)
    }
  }
}
