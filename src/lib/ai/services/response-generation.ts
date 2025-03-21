import type { ReadableStream } from 'node:stream/web'
import type {
  AIService,
  AIMessage,
  AIServiceResponse,
  AICompletionResponse,
  AIStreamChunk,
} from '../models/ai-types'

/**
 * Response Generation Result interface
 */
export interface ResponseGenerationResult {
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  content: string
  metadata?: {
    model?: string
    tokensUsed?: number
  }
  aiService?: AIService
  model?: string
  temperature?: number
  maxResponseTokens?: number
  systemPrompt?: string
}

/**
 * Response Generation Service Configuration
 */
export interface ResponseGenerationConfig {
  aiService: AIService
  model?: string
  temperature?: number
  maxResponseTokens?: number
  systemPrompt?: string
}

/**
 * Type guard to check if response is AICompletionResponse
 */
function isAICompletionResponse(
  response: AICompletionResponse | ReadableStream<AIStreamChunk>
): response is AICompletionResponse {
  return 'choices' in response
}

/**
 * Response Generation Service Implementation
 */
export class ResponseGenerationService {
  private aiService: AIService
  private model: string
  private temperature: number
  private maxResponseTokens: number
  private systemPrompt: string

  constructor(config: ResponseGenerationConfig) {
    this.aiService = config.aiService
    this.model = config.model || 'mistralai/Mixtral-8x7B-Instruct-v0.2'
    this.temperature = config.temperature || 0.7
    this.maxResponseTokens = config.maxResponseTokens || 1024
    this.systemPrompt =
      config.systemPrompt ||
      `You are a supportive and empathetic assistant. Your responses should:
      - Supportive without being judgmental
      - Empathetic and understanding
      - Clear and concise
      - Helpful and informative

      Avoid:
      - Giving medical or legal advice
      - Using clichés or platitudes

      Focus on validating the user's feelings and providing supportive, thoughtful responses.`
  }

  /**
   * Generate a response from messages
   */
  async generateResponseFromMessages(
    messages: AIMessage[],
    instructions?: string
  ): Promise<AIServiceResponse> {
    // Add system instructions if provided
    const messagesWithInstructions = [...messages]
    if (instructions) {
      messagesWithInstructions.unshift({
        role: 'system',
        content: instructions,
        name: '',
      })
    }

    const response = await this.aiService.createChatCompletion(
      messagesWithInstructions,
      {
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxResponseTokens,
      }
    )

    if (!isAICompletionResponse(response)) {
      throw new Error('Expected completion response but got stream')
    }

    // Ensure we have a valid response
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response: missing content')
    }

    // Use type assertion after validation
    const content = response.choices[0].message.content
    const model = response.model || this.model

    // Create usage object with safe defaults
    const usage = {
      promptTokens: Number(response.usage?.promptTokens) || 0,
      completionTokens: Number(response.usage?.completionTokens) || 0,
      totalTokens: Number(response.usage?.totalTokens) || 0,
    }

    return {
      content,
      model,
      usage,
    }
  }

  /**
   * Generate a response from current message and previous messages
   */
  async generateResponse(
    currentMessage: string,
    previousMessages: AIMessage[] = [],
    instructions?: string
  ): Promise<AIServiceResponse> {
    // Format messages
    const messages = [...previousMessages]

    // Add system instructions if provided
    if (instructions) {
      messages.unshift({
        role: 'system',
        content: instructions,
        name: '',
      })
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage,
      name: '',
    })

    return this.generateResponseFromMessages(messages)
  }

  /**
   * Generate a response to a conversation
   */
  async generateResponseToConversation(
    messages: AIMessage[],
    options?: {
      temperature?: number
      maxResponseTokens?: number
      systemPrompt?: string
    }
  ): Promise<ResponseGenerationResult> {
    const temperature = options?.temperature ?? this.temperature
    const maxTokens = options?.maxResponseTokens ?? this.maxResponseTokens
    const systemPrompt = options?.systemPrompt ?? this.systemPrompt

    // Ensure the first message is a system message with our promp
    const messagesWithSystem = [...messages]
    if (
      messagesWithSystem.length === 0 ||
      messagesWithSystem[0].role !== 'system'
    ) {
      messagesWithSystem.unshift({
        role: 'system',
        content: systemPrompt,
        name: '',
      })
    } else {
      messagesWithSystem[0] = {
        role: 'system',
        content: systemPrompt,
        name: '',
      }
    }

    const response = await this.aiService.createChatCompletion(
      messagesWithSystem,
      {
        model: this.model,
        temperature,
        maxTokens,
      }
    )

    if (!isAICompletionResponse(response)) {
      throw new Error('Expected completion response but got stream')
    }

    // Ensure we have a valid response
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response: missing content')
    }

    const content = response.choices[0].message.content

    return {
      content,
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0,
      },
      metadata: {
        model: response.model || this.model,
        tokensUsed:
          (response.usage?.promptTokens || 0) +
          (response.usage?.completionTokens || 0),
      },
      aiService: this.aiService,
      model: this.model,
      temperature,
      maxResponseTokens: this.maxResponseTokens,
      systemPrompt,
    }
  }

  /**
   * Generate a response with specific instructions
   */
  async generateResponseWithInstructions(
    messages: AIMessage[],
    instructions: string,
    options?: {
      temperature?: number
      maxResponseTokens?: number
    }
  ): Promise<ResponseGenerationResult> {
    // Combine system prompt with instructions
    const systemPrompt = `${this.systemPrompt}\n\nAdditional instructions: ${instructions}`

    return this.generateResponseToConversation(messages, {
      ...options,
      systemPrompt,
    })
  }

  /**
   * Generate a streaming response
   */
  async generateStreamingResponse(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      temperature?: number
      maxResponseTokens?: number
      systemPrompt?: string
    }
  ): Promise<ResponseGenerationResult> {
    const temperature = options?.temperature ?? this.temperature
    const maxTokens = options?.maxResponseTokens ?? this.maxResponseTokens
    const systemPrompt = options?.systemPrompt ?? this.systemPrompt

    // Ensure the first message is a system message with our promp
    const messagesWithSystem = [...messages]
    if (
      messagesWithSystem.length === 0 ||
      messagesWithSystem[0].role !== 'system'
    ) {
      messagesWithSystem.unshift({
        role: 'system',
        content: systemPrompt,
        name: '',
      })
    } else {
      messagesWithSystem[0] = {
        role: 'system',
        content: systemPrompt,
        name: '',
      }
    }

    const response = await this.aiService.createStreamingChatCompletion(
      messagesWithSystem,
      {
        model: this.model,
        temperature,
        maxTokens,
      }
    )

    let fullResponse = ''

    if (Symbol.asyncIterator in response) {
      // Handle streaming response
      const stream = response as AsyncIterable<AIStreamChunk>
      for await (const chunk of stream) {
        const content = chunk.content ?? ''
        if (content) {
          fullResponse += content
          onChunk(content)
        }
      }
    } else {
      // Handle non-streaming response
      const nonStreamingResponse = response as AICompletionResponse
      const content = nonStreamingResponse.choices?.[0]?.message?.content ?? ''
      if (content) {
        fullResponse = content
        onChunk(content)
      }
    }

    return {
      content: fullResponse,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      metadata: {
        model: this.model,
      },
      aiService: this.aiService,
      model: this.model,
      temperature,
      maxResponseTokens: this.maxResponseTokens,
      systemPrompt,
    }
  }
}
