import { type APIRoute } from 'astro'
import { getSession } from '../../../lib/auth/session.js'
import { createTogetherAIService } from '../../../lib/ai/services/together.js'
import { createAuditLog } from '../../../lib/audit/log.js'
import { aiRepository } from '../../../lib/db/ai/index.js'
import type { AIMessage as AIMessage } from '../../../lib/ai/models/ai-types.js'
import { InterventionAnalysisService } from '../../../lib/ai/services/intervention-analysis.js'
import { AIService } from '../../../lib/ai/services/ai-service.js'

/**
 * Wrapper for InterventionAnalysisService that works with TogetherAIService.
 * This is deprecated and will be removed in a future version.
 */
class TogetherInterventionAnalysisService {
  private togetherService: any
  public model: string

  constructor(togetherService: any, model: string) {
    this.togetherService = togetherService
    this.model = model
  }

  async analyzeIntervention(
    conversation: AIMessage[],
    interventionMessage: string,
    userResponse: string
  ) {
    // Format messages for analysis
    const messages = [
      {
        role: 'system',
        content: `You are an intervention effectiveness analysis system. Evaluate the effectiveness of therapeutic interventions. Provide a JSON response with: score (0-1), confidence (0-1), areas (array of objects with name and score), and recommendations (array of strings).`,
        name: '',
      },
      {
        role: 'user',
        content: `
        CONVERSATION:
        ${JSON.stringify(conversation)}

        INTERVENTION:
        ${interventionMessage}

        USER RESPONSE:
        ${userResponse}
      `,
        name: '',
      },
    ]

    const response = await this.togetherService.generateCompletion(messages, {
      model: this.model,
      temperature: 0.7,
    })

    try {
      // Extract JSON from response
      const content = response?.content
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/```\n([\s\S]*?)\n```/) ||
        content.match(/{[\s\S]*?}/)

      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const result = JSON.parse(jsonStr)

      // Return standardized result
      return {
        score: Number(result?.score || 0),
        confidence: Number(result?.confidence || 0),
        areas: Array.isArray(result?.areas) ? result?.areas : [],
        recommendations: Array.isArray(result?.recommendations)
          ? result?.recommendations
          : [],
      }
    } catch (error) {
      console.error('Error parsing intervention analysis result:', error)
      return {
        score: 0,
        confidence: 0,
        areas: [],
        recommendations: ['Error analyzing intervention'],
      }
    }
  }

  async analyzeBatch(
    interventions: Array<{
      conversation: AIMessage[]
      interventionMessage: string
      userResponse: string
    }>
  ) {
    return Promise.all(
      interventions.map((item) =>
        this.analyzeIntervention(
          item.conversation,
          item.interventionMessage,
          item.userResponse
        )
      )
    )
  }
}

/**
 * API route for intervention effectiveness analysis
 */
export const POST: APIRoute = async ({ request }) => {
  let session

  try {
    // Verify session
    session = await getSession(request)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const body = await request.json()
    const { conversation, interventionMessage, userResponse, batch, model } =
      body

    // Validate required fields
    if (!(conversation && interventionMessage && userResponse) && !batch) {
      return new Response(
        JSON.stringify({
          error:
            'Either conversation, interventionMessage, and userResponse or batch is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create AI service
    const aiService = createTogetherAIService({
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL,
      apiKey: '',
    })

    // Use the model from the request or the default
    const modelId = model || 'mistralai/Mixtral-8x7B-Instruct-v0.2'

    // Create intervention analysis service
    const interventionService = new InterventionAnalysisService({
      aiService: aiService as any, // Cast to any to bypass type checking
      model: modelId,
    })

    // Log the request
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.intervention.request',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        model: modelId,
        batchSize: batch ? batch.length : 0,
      },
    })

    // Start timer for latency measurement
    const startTime = Date.now()

    // Process the request
    let result
    if (batch) {
      result = await interventionService.analyzeBatch(batch)

      // Store each result in the database
      for (let i = 0; i < result?.length; i++) {
        const analysis = result[i]
        const latencyMs = Date.now() - startTime
        const batchItem = batch[i]

        await aiRepository.storeInterventionAnalysis({
          userId: session?.user?.id,
          modelId: modelId,
          modelProvider: 'together',
          requestTokens: 0, // No usage information available
          responseTokens: 0, // No usage information available
          totalTokens: 0, // No usage information available
          latencyMs,
          success: true,
          error: null,
          conversation: JSON.stringify(batchItem.conversation),
          intervention: batchItem.interventionMessage,
          userResponse: batchItem.userResponse,
          effectiveness: analysis.score,
          insights: JSON.stringify({
            areas: analysis.areas || [],
            confidence: analysis.confidence,
          }),
          recommendedFollowUp: analysis.recommendations
            ? analysis.recommendations.join('\n')
            : '',
          metadata: {
            batchIndex: i,
            batchSize: batch.length,
          },
        })
      }
    } else {
      // Convert conversation to AIMessage[] if it's not already
      const conversationMessages = Array.isArray(conversation)
        ? conversation
        : ([{ role: 'user', content: conversation, name: '' }] as AIMessage[])

      result = await interventionService.analyzeIntervention(
        conversationMessages,
        interventionMessage,
        userResponse
      )

      const latencyMs = Date.now() - startTime

      // Store the result in the database
      await aiRepository.storeInterventionAnalysis({
        userId: session?.user?.id || 'anonymous',
        modelId: modelId,
        modelProvider: 'together',
        requestTokens: 0, // No usage information available
        responseTokens: 0, // No usage information available
        totalTokens: 0, // No usage information available
        latencyMs,
        success: true,
        error: null,
        conversation: JSON.stringify(conversationMessages),
        intervention: interventionMessage,
        userResponse: userResponse,
        effectiveness: result.score,
        insights: JSON.stringify({
          areas: result.areas || [],
          confidence: result.confidence,
        }),
        recommendedFollowUp: result.recommendations
          ? result.recommendations.join('\n')
          : '',
        metadata: {},
      })
    }

    // Log the response
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.intervention.response',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        model: modelId || 'mistralai/Mixtral-8x7B-Instruct-v0.2',
        resultCount: Array.isArray(result) ? result.length : 1,
        latencyMs: Date.now() - startTime,
      },
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error in intervention analysis API:', error)

    // Create audit log for the error
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.intervention.error',
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
        error: 'An error occurred during intervention analysis',
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
