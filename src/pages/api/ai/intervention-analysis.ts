import { type APIRoute } from 'astro';
import { getSession } from '../../../lib/auth/session';
import { createAIService } from '../../../lib/ai/services/together';
import { InterventionAnalysisService } from '../../../lib/ai/services/intervention-analysis';
import { createAuditLog } from '../../../lib/audit/log';
import { aiRepository } from '../../../lib/db/ai';
import type { AIMessage } from '../../../lib/ai/models/types';

/**
 * Wrapper for InterventionAnalysisService that works with TogetherAIService
 */
class TogetherInterventionAnalysisService {
  private togetherService: any;
  public model: string;

  constructor(togetherService: any, model: string) {
    this.togetherService = togetherService;
    this.model = model;
  }

  async analyzeIntervention(
    conversation: AIMessage[],
    interventionMessage: string,
    userResponse: string
  ) {
    // Format messages for analysis
    const messages = [
      { role: 'system', content: `You are an intervention effectiveness analysis system. Evaluate the effectiveness of therapeutic interventions.` },
      { role: 'user', content: `
        CONVERSATION:
        ${JSON.stringify(conversation)}
        
        INTERVENTION:
        ${interventionMessage}
        
        USER RESPONSE:
        ${userResponse}
        
        Analyze the effectiveness and provide a JSON response with: score (0-1), confidence (0-1), areas (array of objects with name and score), and recommendations (array of strings).
      `}
    ];

    const response = await this.togetherService.generateCompletion(messages, {
      model: this.model,
      temperature: 0.1
    });

    try {
      // Extract JSON from response
      const content = response.content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/```\n([\s\S]*?)\n```/) || 
                      content.match(/{[\s\S]*?}/);
      
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const result = JSON.parse(jsonStr);

      // Return standardized result
      return {
        score: Number(result.score || 0),
        confidence: Number(result.confidence || 0),
        areas: Array.isArray(result.areas) ? result.areas : [],
        recommendations: Array.isArray(result.recommendations) ? result.recommendations : []
      };
    } catch (error) {
      console.error('Error parsing intervention analysis result:', error);
      return {
        score: 0,
        confidence: 0,
        areas: [],
        recommendations: ['Error analyzing intervention']
      };
    }
  }

  async analyzeBatch(
    interventions: Array<{
      conversation: AIMessage[];
      interventionMessage: string;
      userResponse: string;
    }>
  ) {
    return Promise.all(
      interventions.map(item => 
        this.analyzeIntervention(
          item.conversation, 
          item.interventionMessage, 
          item.userResponse
        )
      )
    );
  }
}

/**
 * API route for intervention effectiveness analysis
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
    const { conversation, interventionMessage, userResponse, batch, model } = body;

    // Validate required fields
    if (!(conversation && interventionMessage && userResponse) && !batch) {
      return new Response(JSON.stringify({ 
        error: 'Either conversation, interventionMessage, and userResponse or batch is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create AI service
    const togetherService = createAIService({
      togetherApiKey: import.meta.env.TOGETHER_API_KEY,
      togetherBaseUrl: import.meta.env.TOGETHER_BASE_URL
    });

    // Use the model from the request or the default
    const modelId = model || 'mistralai/Mixtral-8x7B-Instruct-v0.1';

    // Create intervention analysis service
    const interventionService = new TogetherInterventionAnalysisService(
      togetherService,
      modelId
    );

    // Log the request
    await createAuditLog({
      userId: session.user.id,
      action: 'ai.intervention.request',
      resource: 'ai',
      metadata: {
        model: modelId,
        batchSize: batch ? batch.length : 0
      }
    });

    // Start timer for latency measurement
    const startTime = Date.now();

    // Process the request
    let result;
    if (batch) {
      result = await interventionService.analyzeBatch(batch);
      
      // Store each result in the database
      for (let i = 0; i < result.length; i++) {
        const analysis = result[i];
        const latencyMs = Date.now() - startTime;
        const batchItem = batch[i];
        
        await aiRepository.storeInterventionAnalysis({
          userId: session.user.id,
          modelId: modelId,
          modelProvider: 'together',
          requestTokens: 0, // No usage information available
          responseTokens: 0, // No usage information available
          totalTokens: 0, // No usage information available
          latencyMs,
          success: true,
          conversation: JSON.stringify(batchItem.conversation),
          intervention: batchItem.interventionMessage,
          userResponse: batchItem.userResponse,
          effectiveness: analysis.score,
          insights: JSON.stringify({
            areas: analysis.areas || [],
            confidence: analysis.confidence
          }),
          recommendedFollowUp: analysis.recommendations ? analysis.recommendations.join('\n') : '',
          metadata: {
            batchIndex: i,
            batchSize: batch.length
          }
        });
      }
    } else {
      // Convert conversation to AIMessage[] if it's not already
      const conversationMessages = Array.isArray(conversation) 
        ? conversation 
        : [{ role: 'user', content: conversation }] as AIMessage[];
      
      result = await interventionService.analyzeIntervention(
        conversationMessages, 
        interventionMessage, 
        userResponse
      );
      
      const latencyMs = Date.now() - startTime;
      
      // Store the result in the database
      await aiRepository.storeInterventionAnalysis({
        userId: session.user.id,
        modelId: modelId,
        modelProvider: 'together',
        requestTokens: 0, // No usage information available
        responseTokens: 0, // No usage information available
        totalTokens: 0, // No usage information available
        latencyMs,
        success: true,
        conversation: JSON.stringify(conversationMessages),
        intervention: interventionMessage,
        userResponse: userResponse,
        effectiveness: result.score,
        insights: JSON.stringify({
          areas: result.areas || [],
          confidence: result.confidence
        }),
        recommendedFollowUp: result.recommendations ? result.recommendations.join('\n') : '',
        metadata: {}
      });
    }

    // Log the response
    await createAuditLog({
      userId: session.user.id,
      action: 'ai.intervention.response',
      resource: 'ai',
      metadata: {
        model: modelId,
        resultCount: Array.isArray(result) ? result.length : 1,
        latencyMs: Date.now() - startTime
      }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Error in intervention analysis API:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 