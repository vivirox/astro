import { type APIRoute } from 'astro'
import { getSession } from '../../../lib/auth/session'
import { createTogetherAIService } from '../../../lib/ai/services/together'
import { createAuditLog } from '../../../lib/audit/log'
import { aiRepository } from '../../../lib/db/ai/index'

/**
 * API route for crisis detection
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
    const { text, batch, model, sensitivityLevel = 5 } = body

    // Validate required fields
    if (!text && !batch) {
      return new Response(
        JSON.stringify({ error: 'Either text or batch is required' }),
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

    // Create crisis detection service wrapper
    const crisisService = {
      detectCrisis: async (text: string) => {
        const response = await aiService.createChatCompletion(
          [
            {
              role: 'system',
              content: 'You are a crisis detection system.',
              name: '',
            },
            {
              role: 'user',
              content: text,
              name: '',
            },
          ],
          { model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1' }
        )

        // Parse the response
        const messageContent = response?.choices?.[0]?.message?.content || '{}'
        const result = JSON.parse(messageContent)

        // Create a standard response format that matches our DB type
        return {
          hasCrisis: result?.hasCrisis,
          confidence: result?.confidence,
          crisisType: result?.crisisType,
          riskLevel: result?.riskLevel,
          content: text,
        }
      },
      detectBatch: async (texts: string[]) => {
        return Promise.all(
          texts.map((text) => crisisService.detectCrisis(text))
        )
      },
      model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
    }

    // Log the request
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.crisis.request',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        model: crisisService.model,
        sensitivityLevel,
        batchSize: batch ? batch.length : 0,
        textLength: text ? text.length : 0,
      },
    })

    // Start timer for latency measurement
    const startTime = Date.now()

    // Process the request
    let result
    let crisisDetected = false

    if (batch) {
      result = await crisisService.detectBatch(batch)

      // Store each result in the database
      for (let i = 0; i < result?.length; i++) {
        const detection = result[i]
        const latencyMs = Date.now() - startTime

        // Check if any crisis was detected
        if (detection.hasCrisis) {
          crisisDetected = true
        }

        await aiRepository.storeCrisisDetection({
          userId: session?.user?.id || 'anonymous',
          modelId: crisisService.model,
          modelProvider: 'together',
          latencyMs,
          success: true,
          error: null,
          text: batch[i],
          crisisDetected: detection.hasCrisis,
          crisisType: detection.crisisType,
          confidence: detection.confidence,
          riskLevel: detection.riskLevel,
          sensitivityLevel,
          requestTokens: 0,
          responseTokens: 0,
          totalTokens: 0,
          metadata: {
            batchIndex: i,
            batchSize: batch.length,
          },
        })
      }
    } else {
      result = await crisisService.detectCrisis(text)
      const latencyMs = Date.now() - startTime

      // Check if crisis was detected
      if (result?.hasCrisis) {
        crisisDetected = true
      }

      // Store the result in the database
      await aiRepository.storeCrisisDetection({
        userId: session?.user?.id || 'anonymous',
        modelId: crisisService.model,
        modelProvider: 'together',
        latencyMs,
        success: true,
        error: null,
        text,
        crisisDetected: result?.hasCrisis,
        crisisType: result?.crisisType,
        confidence: result?.confidence,
        riskLevel: result?.riskLevel,
        sensitivityLevel,
        requestTokens: 0,
        responseTokens: 0,
        totalTokens: 0,
        metadata: {
          category: result?.crisisType,
        },
      })
    }

    // Log the response
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.crisis.response',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        model: crisisService.model,
        resultCount: batch ? (result as any[]).length : 1,
        crisisDetected,
        latencyMs: Date.now() - startTime,
        priority: crisisDetected ? 'high' : 'normal',
      },
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Error in crisis detection API:', error)

    // Create audit log for the error
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.crisis.error',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        error: error instanceof Error ? error?.message : String(error),
        stack: error instanceof Error ? error?.stack : undefined,
        status: 'error',
      },
    })

    return new Response(
      JSON.stringify({
        error: 'An error occurred during crisis detection analysis',
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
