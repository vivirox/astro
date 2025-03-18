import { AIServiceConfig, AIServiceResponse, Message } from '../types';

// TogetherAI API configuration
interface TogetherAIConfig {
  togetherApiKey: string;
  togetherBaseUrl?: string;
}

// TogetherAI service interface
export interface TogetherAIService {
  generateCompletion(
    messages: Message[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      stop?: string[];
    }
  ): Promise<AIServiceResponse>;
}

/**
 * Create a TogetherAI service instance
 * @param config The TogetherAI configuration
 * @returns A TogetherAI service instance
 */
export function createAIService(config: TogetherAIConfig): TogetherAIService {
  const baseUrl = config.togetherBaseUrl || 'https://api.together.xyz/v1';
  const apiKey = config.togetherApiKey;

  if (!apiKey) {
    throw new Error('TogetherAI API key is required');
  }

  return {
    async generateCompletion(
      messages: Message[],
      options = {}
    ): Promise<AIServiceResponse> {
      try {
        const {
          model = 'mistralai/Mixtral-8x7B-Instruct-v0.1',
          temperature = 0.7,
          maxTokens = 1000,
          topP = 1,
          frequencyPenalty = 0,
          presencePenalty = 0,
          stop = []
        } = options;

        // Format messages for TogetherAI API
        const formattedMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Make API request
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
            top_p: topP,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            stop
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`TogetherAI API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Format response
        return {
          content: data.choices[0].message.content,
          usage: {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          },
          model: data.model,
          provider: 'together'
        };
      } catch (error) {
        console.error('Error generating completion:', error);
        throw error;
      }
    }
  };
} 