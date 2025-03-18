import { AIService } from './ai-service';
import { AIMessage, InterventionEffectivenessResult } from '../models/types';
import { getDefaultModelForCapability } from '../models/registry';

/**
 * Intervention Analysis Service Configuration
 */
export interface InterventionAnalysisConfig {
  aiService: AIService;
  model?: string;
  systemPrompt?: string;
}

/**
 * Intervention Analysis Result
 */
export type InterventionAnalysisResult = InterventionEffectivenessResult;

/**
 * Intervention Analysis Service Implementation
 */
export class InterventionAnalysisService {
  private aiService: AIService;
  private model: string;
  private systemPrompt: string;

  constructor(config: InterventionAnalysisConfig) {
    this.aiService = config.aiService;
    this.model = config.model || getDefaultModelForCapability('intervention').id;
    
    this.systemPrompt = config.systemPrompt || 
      `You are an intervention effectiveness analysis system. Your task is to evaluate the effectiveness of 
      therapeutic interventions based on the conversation context and the user's response.
      
      Analyze the following aspects:
      - Relevance: How well the intervention addresses the user's specific concerns
      - Tone: Whether the tone was appropriate for the situation
      - Clarity: How clear and understandable the intervention was
      - Impact: The apparent effect on the user's emotional state or perspective
      - Engagement: How well the user engaged with the intervention
      
      Return the result as a JSON object with the following structure:
      {
        "score": number, // 0 to 1, where 0 is ineffective and 1 is very effective
        "confidence": number, // 0 to 1
        "areas": [
          {
            "name": string, // e.g., "relevance", "tone", "clarity", "impact", "engagement"
            "score": number // 0 to 1
          }
        ],
        "recommendations": string[] // List of recommendations for improvement
      }`;
  }

  /**
   * Analyze the effectiveness of an intervention
   */
  async analyzeIntervention(
    conversation: AIMessage[],
    interventionMessage: string,
    userResponse: string,
    options?: {
      customPrompt?: string;
    }
  ): Promise<InterventionAnalysisResult> {
    const prompt = options?.customPrompt || this.systemPrompt;
    
    // Format the conversation for analysis
    const conversationText = conversation
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
    
    const analysisPrompt = `
      CONVERSATION HISTORY:
      ${conversationText}
      
      INTERVENTION:
      ${interventionMessage}
      
      USER RESPONSE:
      ${userResponse}
      
      Please analyze the effectiveness of this intervention based on the user's response.
    `;
    
    const messages: AIMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: analysisPrompt }
    ];

    const response = await this.aiService.createChatCompletion(messages, {
      model: this.model,
      temperature: 0.1 // Low temperature for more consistent results
    });

    try {
      // Extract JSON from response
      const content = response.message.content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*?}/);
      
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const result = JSON.parse(jsonStr);

      // Validate and normalize the result
      return {
        score: Number(result.score),
        confidence: Number(result.confidence),
        areas: Array.isArray(result.areas) ? result.areas.map((area: any) => ({
          name: String(area.name),
          score: Number(area.score)
        })) : [],
        recommendations: Array.isArray(result.recommendations) ? 
          result.recommendations.map((rec: any) => String(rec)) : []
      };
    } catch (error) {
      console.error('Error parsing intervention analysis result:', error);
      throw new Error('Failed to parse intervention analysis result');
    }
  }

  /**
   * Analyze multiple interventions
   */
  async analyzeBatch(
    interventions: Array<{
      conversation: AIMessage[];
      interventionMessage: string;
      userResponse: string;
    }>
  ): Promise<InterventionAnalysisResult[]> {
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