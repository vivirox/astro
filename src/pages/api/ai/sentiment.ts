import { type APIRoute } from 'astro'
// Import session types directly
import type { SessionData } from '../../../lib/auth/session'
import { createTogetherAIService } from '../../../lib/ai/services/together'
import { SentimentAnalysisService } from '../../../lib/ai/services/sentiment-analysis'
import { createAuditLog } from '../../../lib/audit/log'
import { aiRepository } from '../../../lib/db/ai/index'
import type { AIMessage } from '../../../lib/ai/models/ai-types'

// Create a custom adapter for the SentimentAnalysisService
class TogetherAIAdapter {
  private togetherService: any

  constructor(togetherService: any) {
    this.togetherService = togetherService
  }

  async generateCompletion(messages: AIMessage[], options: any = {}) {
    const response = await this.togetherService.generateCompletion(
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name || 'default_name',
      })),
      options
    )
    return {
      id: 'together-completion',
      model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      created: Date.now(),
      message: { role: 'assistant', content: response?.content },
      usage: {
        promptTokens: response?.usage?.promptTokens || 0,
        completionTokens: response?.usage?.completionTokens || 0,
        totalTokens: response?.usage?.totalTokens || 0,
      },
      provider: 'together',
    }
  }
  async createChatCompletion(messages: AIMessage[], options: any = {}) {
    const response = await this.togetherService.generateCompletion(
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.name || 'default_name',
      })),
      options
    )
    return {
      id: 'together-completion',
      model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      created: Date.now(),
      message: { role: 'assistant', content: response?.content },
      usage: {
        promptTokens: response?.usage?.promptTokens || 0,
        completionTokens: response?.usage?.completionTokens || 0,
        totalTokens: response?.usage?.totalTokens || 0,
      },
      provider: 'together',
    }
  }
}

// Helper function to get session
async function getSessionHelper(request: Request): Promise<SessionData | null> {
  // Dynamically import the session module
  const sessionModule = await import('../../../lib/auth/session')
  return sessionModule.getSession(request)
}

/**
 * API route for sentiment analysis
 */
export const POST: APIRoute = async ({ request }) => {
  let session

  try {
    // Verify session
    session = await getSessionHelper(request)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const body = await request.json()
    const { text, model } = body

    // Validate required fields
    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create AI service
    const togetherService = createTogetherAIService({
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL,
      apiKey: '',
    })

    // Create adapter
    const aiAdapter = new TogetherAIAdapter(togetherService)

    // Create sentiment analysis service
    const sentimentService = new SentimentAnalysisService({
      aiService: aiAdapter as any,
      model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    })

    // Log the request
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.sentiment.request',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        model,
        textLength: text.length,
      },
    })

    // Start timer for latency measurement
    const startTime = Date.now()

    // Process the request
    const result = await sentimentService.analyzeSentiment(text)
    const latencyMs = Date.now() - startTime

    // Store the result in the database
    await aiRepository.storeSentimentAnalysis({
      userId: session?.user?.id,
      modelId: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      modelProvider: 'together',
      requestTokens: 0, // We don't have usage data from SentimentResult
      responseTokens: 0, // We don't have usage data from SentimentResult
      totalTokens: 0, // We don't have usage data from SentimentResult
      latencyMs,
      success: true,
      error: null,
      text,
      sentiment: result.label,
      score: result.score,
      confidence: result.confidence,
      metadata: {},
    })

    // Log the response
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.sentiment.response',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        latencyMs: Date.now() - startTime,
      },
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error in sentiment analysis API:', error)

    // Create audit log for the error
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.sentiment.error',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        status: 'error',
      },
    })

    return new Response(
      JSON.stringify({
        error: 'An error occurred during sentiment analysis',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
