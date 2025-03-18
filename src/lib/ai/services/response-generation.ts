import { AIService } from './ai-service';
import { AIMessage, ResponseGenerationResult } from '../models/types';
import { getDefaultModelForCapability } from '../models/registry';

/**
 * Response Generation Service Configuration
 */
export interface ResponseGenerationConfig {
  aiService: AIService;
  model?: string;
  systemPrompt?: string;
  maxResponseTokens?: number;
  temperature?: number;
}

/**
 * Response Generation Service Implementation
 */
export class ResponseGenerationService {
  private aiService: AIService;
  private model: string;
  private systemPrompt: string;
  private maxResponseTokens: number;
  private temperature: number;

  constructor(config: ResponseGenerationConfig) {
    this.aiService = config.aiService;
    this.model = config.model || getDefaultModelForCapability('response').id;
    this.maxResponseTokens = config.maxResponseTokens || 1024;
    this.temperature = config.temperature || 0.7;
    
    this.systemPrompt = config.systemPrompt || 
      `You are a supportive and empathetic assistant. Your responses should be:
      - Empathetic and understanding
      - Supportive without being judgmental
      - Clear and concise
      - Helpful and informative
      - Appropriate for the context and emotional state of the user
      
      Avoid:
      - Making assumptions about the user's situation
      - Giving medical or legal advice
      - Minimizing the user's concerns
      - Using clichés or platitudes
      
      Focus on validating the user's feelings and providing supportive, thoughtful responses.`;
  }

  /**
   * Generate a response to a conversation
   */
  async generateResponse(
    messages: AIMessage[],
    options?: {
      temperature?: number;
      maxResponseTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<ResponseGenerationResult> {
    const temperature = options?.temperature ?? this.temperature;
    const maxTokens = options?.maxResponseTokens ?? this.maxResponseTokens;
    const systemPrompt = options?.systemPrompt ?? this.systemPrompt;
    
    // Ensure the first message is a system message with our prompt
    const messagesWithSystem = [...messages];
    if (messagesWithSystem.length === 0 || messagesWithSystem[0].role !== 'system') {
      messagesWithSystem.unshift({ role: 'system', content: systemPrompt });
    } else {
      messagesWithSystem[0] = { role: 'system', content: systemPrompt };
    }

    const startTime = Date.now();
    const response = await this.aiService.createChatCompletion(messagesWithSystem, {
      model: this.model,
      temperature,
      maxTokens
    });

    const processingTime = Date.now() - startTime;
    const content = response.message.content;

    return {
      response: content,
      metadata: {
        model: response.model,
        processingTime,
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens
      }
    };
  }

  /**
   * Generate a response with specific instructions
   */
  async generateResponseWithInstructions(
    messages: AIMessage[],
    instructions: string,
    options?: {
      temperature?: number;
      maxResponseTokens?: number;
    }
  ): Promise<ResponseGenerationResult> {
    // Combine system prompt with instructions
    const systemPrompt = `${this.systemPrompt}\n\nAdditional instructions: ${instructions}`;
    
    return this.generateResponse(messages, {
      ...options,
      systemPrompt
    });
  }

  /**
   * Generate a streaming response
   */
  async generateStreamingResponse(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: {
      temperature?: number;
      maxResponseTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<ResponseGenerationResult> {
    const temperature = options?.temperature ?? this.temperature;
    const maxTokens = options?.maxResponseTokens ?? this.maxResponseTokens;
    const systemPrompt = options?.systemPrompt ?? this.systemPrompt;
    
    // Ensure the first message is a system message with our prompt
    const messagesWithSystem = [...messages];
    if (messagesWithSystem.length === 0 || messagesWithSystem[0].role !== 'system') {
      messagesWithSystem.unshift({ role: 'system', content: systemPrompt });
    } else {
      messagesWithSystem[0] = { role: 'system', content: systemPrompt };
    }

    const startTime = Date.now();
    const streamResponse = await this.aiService.createStreamingChatCompletion(messagesWithSystem, {
      model: this.model,
      temperature,
      maxTokens
    });

    let fullResponse = '';
    
    // Process the stream
    const stream = streamResponse.stream();
    for await (const chunk of stream) {
      fullResponse += chunk;
      onChunk(chunk);
    }

    const processingTime = Date.now() - startTime;

    return {
      response: fullResponse,
      metadata: {
        model: this.model,
        processingTime
      }
    };
  }
} 