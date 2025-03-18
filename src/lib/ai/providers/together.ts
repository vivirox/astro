import type { 
  AICompletionRequest, 
  AICompletionResponse, 
  AIMessage, 
  AIStreamChunk,
  AIError,
  AIUsageRecord
} from '../models/ai-types';
import { ConnectionPoolManager } from '../services/connection-pool';

/**
 * TogetherAI Provider Configuration
 */
export interface TogetherAIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  connectionPool?: ConnectionPoolManager;
}

/**
 * TogetherAI Provider Implementation
 */
export class TogetherAIProvider {
  private apiKey: string;
  private baseUrl: string;
  private connectionPool?: ConnectionPoolManager;

  constructor(config: TogetherAIProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.TOGETHER_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.together.xyz/v1';
    this.connectionPool = config.connectionPool;

    if (!this.apiKey) {
      console.warn('TogetherAI API key not provided. API calls will fail.');
    }
  }

  /**
   * Create a chat completion using TogetherAI
   */
  async createChatCompletion(
    messages: AIMessage[],
    options: {
      model: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<AICompletionResponse> {
    try {
      const { model, temperature = 0.7, maxTokens, stream = false } = options;
      const startTime = Date.now();

      // Format messages for TogetherAI API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Prepare request body
      const body: Record<string, any> = {
        model,
        messages: formattedMessages,
        temperature,
        stream
      };

      // Add max_tokens if provided
      if (maxTokens) {
        body.max_tokens = maxTokens;
      }

      // Get connection from pool if available
      const { controller, headers: connectionHeaders } = this.connectionPool 
        ? this.connectionPool.getConnection()
        : { controller: new AbortController(), headers: {} };

      // Make API request with connection pooling
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...connectionHeaders
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      // Get connection ID for release
      const connectionId = connectionHeaders['X-Connection-Id'];

      if (!response.ok) {
        // Release connection on error
        if (this.connectionPool && connectionId) {
          this.connectionPool.releaseConnection(connectionId);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(`TogetherAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      // Handle streaming response
      if (stream) {
        return {
          provider: 'together',
          model,
          choices: [],
          stream: this.handleStream(response, model, connectionId)
        };
      }

      // Handle regular response
      const data = await response.json();
      
      // Release connection after use
      if (this.connectionPool && connectionId) {
        this.connectionPool.releaseConnection(connectionId);
      }
      
      // Calculate token usage
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      
      const usage: AIUsageRecord = {
        provider: 'together' as const,
        model,
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        timestamp: new Date().toISOString(),
        processingTimeMs
      };

      return {
        provider: 'together',
        model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: data.choices[0]?.message?.content || ''
            },
            finishReason: data.choices[0]?.finish_reason || null
          }
        ],
        usage
      };
    } catch (error) {
      const aiError: AIError = {
        provider: 'together',
        message: error instanceof Error ? error.message : String(error),
        status: 500,
        type: 'provider_error'
      };
      throw aiError;
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
    if (!response.body) {
      // Release connection if no body
      if (this.connectionPool && connectionId) {
        this.connectionPool.releaseConnection(connectionId);
      }
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let promptTokens = 0;
    let completionTokens = 0;
    const startTime = Date.now();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const delta = json.choices[0]?.delta;
            const finishReason = json.choices[0]?.finish_reason;

            if (delta?.content) {
              completionTokens += 1; // Approximate token count
              
              yield {
                provider: 'together',
                model,
                delta: {
                  content: delta.content
                },
                finishReason: finishReason || null
              };
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error reading stream:', error);
      throw error;
    } finally {
      // Release connection when done
      if (this.connectionPool && connectionId) {
        this.connectionPool.releaseConnection(connectionId);
      }
      
      // Final usage record
      const endTime = Date.now();
      const processingTimeMs = endTime - startTime;
      const totalTokens = promptTokens + completionTokens;
      
      yield {
        provider: 'together',
        model,
        usage: {
          provider: 'together',
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          timestamp: new Date().toISOString(),
          processingTimeMs
        },
        finishReason: 'stop'
      };
    }
  }
} 