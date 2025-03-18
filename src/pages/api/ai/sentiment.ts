import { type APIRoute } from 'astro';
// Import session types directly
import type { SessionData } from '../../../lib/auth/session';
import { createAIService, type TogetherAIService } from '../../../lib/ai/services/together';
import { SentimentAnalysisService } from '../../../lib/ai/services/sentiment-analysis';
import { createAuditLog } from '../../../lib/audit/log';
import { aiRepository } from '../../../lib/db/ai';
import type { SentimentResult } from '../../../lib/ai/models/types';
import type { AIMessage } from '../../../lib/ai/models/types';

// Create a custom adapter for the SentimentAnalysisService
class TogetherAIAdapter {
  private togetherService: TogetherAIService;
  
  constructor(togetherService: TogetherAIService) {
    this.togetherService = togetherService;
  }
  
  async createChatCompletion(messages: AIMessage[], options: any = {}) {
    const response = await this.togetherService.generateCompletion(messages, options);
    return {
      id: 'together-completion',
      model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      provider: 'together',
      created: Date.now(),
      message: { role: 'assistant', content: response.content },
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens: response.usage?.totalTokens || 0
      }
    };
  }
}

// Helper function to get session
async function getSessionHelper(request: Request): Promise<SessionData | null> {
  // Dynamically import the session module
  const sessionModule = await import('../../../lib/auth/session');
  return sessionModule.getSession(request);
}

/**
 * API route for sentiment analysis
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify session
    const session = await getSessionHelper(request);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { text, model } = body;

    // Validate required fields
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create AI service
    const togetherService = createAIService({
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL
    });
    
    // Create adapter
    const aiAdapter = new TogetherAIAdapter(togetherService);

    // Create sentiment analysis service
    const sentimentService = new SentimentAnalysisService({
      aiService: aiAdapter as any,
      model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1'
    });

    // Log the request
    await createAuditLog({
      userId: session.user.id,
      action: 'ai.sentiment.request',
      resource: 'ai',
      metadata: {
        model,
        textLength: text.length
      }
    });

    // Start timer for latency measurement
    const startTime = Date.now();

    // Process the request
    const result = await sentimentService.analyzeSentiment(text);
    const latencyMs = Date.now() - startTime;
    
    // Store the result in the database
    await aiRepository.storeSentimentAnalysis({
      userId: session.user.id,
      modelId: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      modelProvider: 'together',
      requestTokens: 0, // We don't have usage data from SentimentResult
      responseTokens: 0, // We don't have usage data from SentimentResult
      totalTokens: 0, // We don't have usage data from SentimentResult
      latencyMs,
      success: true,
      text,
      sentiment: result.label,
      score: result.score,
      confidence: result.confidence,
      metadata: {}
    });

    // Log the response
    await createAuditLog({
      userId: session.user.id,
      action: 'ai.sentiment.analyzed',
      resource: 'ai',
      metadata: {
        model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        latencyMs: Date.now() - startTime
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error in sentiment analysis API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 