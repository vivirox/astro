import { type APIRoute } from 'astro';
import { getSession } from '../../../lib/auth/session';
import { createAIService } from '../../../lib/ai/services/together';
import { CrisisDetectionService } from '../../../lib/ai/services/crisis-detection';
import { createAuditLog } from '../../../lib/audit/log';
import { aiRepository } from '../../../lib/db/ai';
import type { CrisisDetectionResult } from '../../../lib/ai/types';

/**
 * API route for crisis detection
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify session
    const session = await getSession(request);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { text, batch, model, sensitivityLevel = 5 } = body;

    // Validate required fields
    if (!text && !batch) {
      return new Response(JSON.stringify({ error: 'Either text or batch is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create AI service
    const aiService = createAIService({
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL
    });

    // Create crisis detection service wrapper
    const crisisService = {
      detectCrisis: async (text: string) => {
        const result = await aiService.generateCompletion(
          [
            { role: 'system', content: 'You are a crisis detection system.' },
            { role: 'user', content: text }
          ],
          { model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1' }
        );
        
        return {
          hasCrisis: true, // This would be parsed from the AI response
          riskLevel: 'medium' as const,
          confidence: 0.8,
          categories: ['self-harm'],
          explanation: 'Detected concerning content',
          content: text,
          usage: result.usage
        } as CrisisDetectionResult;
      },
      detectBatch: async (texts: string[]) => {
        return Promise.all(texts.map(text => crisisService.detectCrisis(text)));
      },
      model: model || 'mistralai/Mixtral-8x7B-Instruct-v0.1'
    };

    // Log the request
    await createAuditLog({
      userId: session.user.id,
      action: 'ai.crisis.request',
      resource: 'ai',
      metadata: {
        model: crisisService.model,
        sensitivityLevel,
        batchSize: batch ? batch.length : 0,
        textLength: text ? text.length : 0
      }
    });

    // Start timer for latency measurement
    const startTime = Date.now();

    // Process the request
    let result;
    let crisisDetected = false;

    if (batch) {
      result = await crisisService.detectBatch(batch);
      
      // Store each result in the database
      for (let i = 0; i < result.length; i++) {
        const detection = result[i];
        const latencyMs = Date.now() - startTime;
        
        // Check if any crisis was detected
        if (detection.hasCrisis) {
          crisisDetected = true;
        }
        
        await aiRepository.storeCrisisDetection({
          userId: session.user.id,
          modelId: crisisService.model,
          modelProvider: 'together',
          requestTokens: detection.usage?.promptTokens || 0,
          responseTokens: detection.usage?.completionTokens || 0,
          totalTokens: detection.usage?.totalTokens || 0,
          latencyMs,
          success: true,
          text: batch[i],
          crisisDetected: detection.hasCrisis,
          crisisType: detection.categories?.[0],
          confidence: detection.confidence,
          riskLevel: detection.riskLevel === 'none' ? 'low' : 
                    (detection.riskLevel === 'severe' ? 'critical' : detection.riskLevel),
          sensitivityLevel,
          metadata: {
            batchIndex: i,
            batchSize: batch.length,
            categories: detection.categories,
            explanation: detection.explanation
          }
        });
      }
    } else {
      result = await crisisService.detectCrisis(text);
      const latencyMs = Date.now() - startTime;
      
      // Check if crisis was detected
      if (result.hasCrisis) {
        crisisDetected = true;
      }
      
      // Store the result in the database
      await aiRepository.storeCrisisDetection({
        userId: session.user.id,
        modelId: crisisService.model,
        modelProvider: 'together',
        requestTokens: result.usage?.promptTokens || 0,
        responseTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
        latencyMs,
        success: true,
        text,
        crisisDetected: result.hasCrisis,
        crisisType: result.categories?.[0],
        confidence: result.confidence,
        riskLevel: result.riskLevel === 'none' ? 'low' : 
                  (result.riskLevel === 'severe' ? 'critical' : result.riskLevel),
        sensitivityLevel,
        metadata: {
          categories: result.categories,
          explanation: result.explanation
        }
      });
    }

    // Log the response
    await createAuditLog({
      userId: session.user.id,
      action: 'ai.crisis.response',
      resource: 'ai',
      metadata: {
        model: crisisService.model,
        resultCount: batch ? (result as CrisisDetectionResult[]).length : 1,
        crisisDetected,
        latencyMs: Date.now() - startTime,
        priority: crisisDetected ? 'high' : 'normal'
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error in crisis detection API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 