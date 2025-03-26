import type { FHEService } from '../../fhe'
import type { AIResponse, AIServiceOptions, Message } from '../AIService'
import type {
  EmotionAnalysis,
  TherapyAIOptions,
  TherapyAIProvider,
  TherapyAIResponse,
  TherapySession,
} from '../interfaces/therapy'
import { logger } from '../../utils/logger'

export class EmotionLlamaProvider implements TherapyAIProvider {
  private fheService: FHEService
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string, fheService: FHEService) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.fheService = fheService
  }

  async createChatCompletion(
    messages: Message[],
    options?: AIServiceOptions,
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages,
          model: options?.model || 'emotion-llama-2',
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        content: data.choices[0].message.content,
        usage: {
          totalTokens: data.usage.total_tokens,
        },
      }
    } catch (error) {
      logger.error('Chat completion failed:', error)
      throw error
    }
  }

  async analyzeEmotions(
    text: string,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis> {
    try {
      // If FHE is enabled, encrypt the text before analysis
      const processedText = options?.securityOptions?.useEncryption
        ? await this.fheService.encryptText(text)
        : text

      const response = await fetch(`${this.baseUrl}/v1/emotions/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          text: processedText,
          security_level:
            options?.securityOptions?.encryptionLevel || 'standard',
        }),
      })

      if (!response.ok) {
        throw new Error(`Emotion analysis failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        timestamp: new Date(),
        emotions: data.emotions.map((e: any) => ({
          type: e.type,
          confidence: e.confidence,
          intensity: e.intensity,
        })),
        overallSentiment: data.overall_sentiment,
        riskFactors: data.risk_factors.map((r: any) => ({
          type: r.type,
          severity: r.severity,
          confidence: r.confidence,
        })),
        requiresAttention: data.requires_attention,
      }
    } catch (error) {
      logger.error('Emotion analysis failed:', error)
      throw error
    }
  }

  async generateIntervention(
    context: TherapySession,
    analysis: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/interventions/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            session_context: context,
            emotion_analysis: analysis,
          }),
        },
      )

      if (!response.ok) {
        throw new Error(
          `Intervention generation failed: ${response.statusText}`,
        )
      }

      const data = await response.json()
      return {
        content: data.response,
        emotions: data.updated_emotions,
        suggestedInterventions: data.interventions,
        riskAssessment: data.risk_assessment,
        nextSteps: data.next_steps,
      }
    } catch (error) {
      logger.error('Intervention generation failed:', error)
      throw error
    }
  }

  async assessRisk(
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ): Promise<TherapyAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/risk/assess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          session,
          recent_analyses: recentAnalyses,
        }),
      })

      if (!response.ok) {
        throw new Error(`Risk assessment failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        content: data.assessment_summary,
        riskAssessment: {
          level: data.risk_level,
          factors: data.risk_factors,
          recommendedActions: data.recommended_actions,
        },
        nextSteps: data.next_steps,
      }
    } catch (error) {
      logger.error('Risk assessment failed:', error)
      throw error
    }
  }

  async handleEmergency(
    session: TherapySession,
    trigger: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/emergency/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          session,
          trigger_analysis: trigger,
        }),
      })

      if (!response.ok) {
        throw new Error(`Emergency handling failed: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        content: data.emergency_response,
        riskAssessment: {
          level: 'critical',
          factors: data.critical_factors,
          recommendedActions: data.immediate_actions,
        },
        nextSteps: data.emergency_steps.map((step: any) => ({
          type: 'emergency',
          content: step.action,
          reasoning: step.reason,
        })),
      }
    } catch (error) {
      logger.error('Emergency handling failed:', error)
      throw error
    }
  }
}
