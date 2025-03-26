import type { TherapyAICache } from './cache/TherapyAICache'
import { PerformanceLogger } from '../logging/performance-logger'

// Define interfaces
interface PerformanceMetrics {
  model: string
  latency: number
  totalTokens?: number
  success: boolean
  errorCode?: string
  cached: boolean
  optimized: boolean
  requestId: string
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AIServiceOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

interface AIResponse {
  content: string
  usage?: {
    totalTokens: number
  }
}

interface TherapySession {
  sessionId: string
  clientId: string
  therapistId: string
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed' | 'emergency'
  securityLevel: 'standard' | 'hipaa' | 'fhe'
  emotionAnalysisEnabled: boolean
}

interface EmotionAnalysis {
  timestamp: Date
  emotions: {
    type: string
    confidence: number
    intensity: number
  }[]
  overallSentiment: number
  riskFactors: {
    type: string
    severity: number
    confidence: number
  }[]
  requiresAttention: boolean
}

interface TherapyAIResponse extends AIResponse {
  emotions?: EmotionAnalysis
  suggestedInterventions?: {
    type: string
    priority: number
    description: string
    evidence: string
  }[]
  riskAssessment?: {
    level: 'low' | 'medium' | 'high' | 'critical'
    factors: string[]
    recommendedActions: string[]
  }
  nextSteps?: {
    type: 'question' | 'intervention' | 'referral' | 'emergency'
    content: string
    reasoning: string
  }[]
}

interface TherapyAIOptions extends AIServiceOptions {
  sessionContext?: TherapySession
  previousEmotions?: EmotionAnalysis[]
  interventionHistory?: {
    type: string
    timestamp: Date
    outcome: string
  }[]
  securityOptions?: {
    useEncryption: boolean
    encryptionLevel: 'standard' | 'fhe'
    allowThirdParty: boolean
  }
}

interface TherapyAIProvider extends AIProvider {
  analyzeEmotions: (
    text: string,
    options?: TherapyAIOptions,
  ) => Promise<EmotionAnalysis>
  generateIntervention: (
    context: TherapySession,
    analysis: EmotionAnalysis,
  ) => Promise<TherapyAIResponse>
  assessRisk: (
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ) => Promise<TherapyAIResponse>
  handleEmergency: (
    session: TherapySession,
    trigger: EmotionAnalysis,
  ) => Promise<TherapyAIResponse>
}

// Utility function for generating request IDs
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export class AIService {
  private performanceLogger: PerformanceLogger
  private cache: AICache | TherapyAICache
  private provider: AIProvider | TherapyAIProvider

  constructor(
    cache: AICache | TherapyAICache,
    provider: AIProvider | TherapyAIProvider,
  ) {
    this.performanceLogger = PerformanceLogger.getInstance()
    this.cache = cache
    this.provider = provider
  }

  private async trackPerformance(metric: PerformanceMetrics) {
    await this.performanceLogger.logMetric(metric)
  }

  async createChatCompletion(
    messages: Message[],
    options?: AIServiceOptions,
  ): Promise<AIResponse> {
    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache first
      const cachedResponse = await this.cache.get(messages, options)
      if (cachedResponse) {
        await this.trackPerformance({
          model: options?.model || 'unknown',
          latency: Date.now() - startTime,
          totalTokens: cachedResponse.usage?.totalTokens,
          success: true,
          cached: true,
          optimized: false,
          requestId: generateRequestId(),
        })
        return cachedResponse
      }

      // Make the actual request
      const response = await this.provider.createChatCompletion(
        messages,
        options,
      )

      // Track performance
      await this.trackPerformance({
        model: options?.model || 'unknown',
        latency: Date.now() - startTime,
        totalTokens: response.usage?.totalTokens,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      return response
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      // Track error performance
      await this.trackPerformance({
        model: options?.model || 'unknown',
        latency: Date.now() - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      throw error
    }
  }

  private isTherapyProvider(
    provider: AIProvider | TherapyAIProvider,
  ): provider is TherapyAIProvider {
    return (
      'analyzeEmotions' in provider &&
      'generateIntervention' in provider &&
      'assessRisk' in provider &&
      'handleEmergency' in provider
    )
  }

  private isTherapyCache(
    cache: AICache | TherapyAICache,
  ): cache is TherapyAICache {
    return (
      'getEmotionAnalysis' in cache &&
      'getIntervention' in cache &&
      'getRiskAssessment' in cache
    )
  }

  async analyzeEmotions(
    text: string,
    options?: TherapyAIOptions,
  ): Promise<EmotionAnalysis> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error('Current provider does not support emotion analysis')
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache if available
      if (this.isTherapyCache(this.cache)) {
        const cachedAnalysis = await this.cache.getEmotionAnalysis(
          text,
          options,
        )
        if (cachedAnalysis) {
          await this.trackPerformance({
            model: options?.model || 'emotion-analysis',
            latency: Date.now() - startTime,
            success: true,
            cached: true,
            optimized: false,
            requestId: generateRequestId(),
          })
          return cachedAnalysis
        }
      }

      const analysis = await this.provider.analyzeEmotions(text, options)

      // Cache the result if possible
      if (this.isTherapyCache(this.cache)) {
        await this.cache.cacheEmotionAnalysis(text, analysis, options)
      }

      await this.trackPerformance({
        model: options?.model || 'emotion-analysis',
        latency: Date.now() - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      return analysis
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      await this.trackPerformance({
        model: options?.model || 'emotion-analysis',
        latency: Date.now() - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      throw error
    }
  }

  async generateIntervention(
    context: TherapySession,
    analysis: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error(
        'Current provider does not support intervention generation',
      )
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache if available
      if (this.isTherapyCache(this.cache)) {
        const cachedResponse = await this.cache.getIntervention(
          context,
          analysis,
        )
        if (cachedResponse) {
          await this.trackPerformance({
            model: 'intervention-generator',
            latency: Date.now() - startTime,
            success: true,
            cached: true,
            optimized: false,
            requestId: generateRequestId(),
          })
          return cachedResponse
        }
      }

      const response = await this.provider.generateIntervention(
        context,
        analysis,
      )

      // Cache the result if possible
      if (this.isTherapyCache(this.cache)) {
        await this.cache.cacheIntervention(context, analysis, response)
      }

      await this.trackPerformance({
        model: 'intervention-generator',
        latency: Date.now() - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      return response
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      await this.trackPerformance({
        model: 'intervention-generator',
        latency: Date.now() - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      throw error
    }
  }

  async assessRisk(
    session: TherapySession,
    recentAnalyses: EmotionAnalysis[],
  ): Promise<TherapyAIResponse> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error('Current provider does not support risk assessment')
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      // Check cache if available
      if (this.isTherapyCache(this.cache)) {
        const cachedAssessment = await this.cache.getRiskAssessment(
          session,
          recentAnalyses,
        )
        if (cachedAssessment) {
          await this.trackPerformance({
            model: 'risk-assessment',
            latency: Date.now() - startTime,
            success: true,
            cached: true,
            optimized: false,
            requestId: generateRequestId(),
          })
          return cachedAssessment
        }
      }

      const assessment = await this.provider.assessRisk(session, recentAnalyses)

      // Cache the result if possible
      if (this.isTherapyCache(this.cache)) {
        await this.cache.cacheRiskAssessment(
          session,
          recentAnalyses,
          assessment,
        )
      }

      await this.trackPerformance({
        model: 'risk-assessment',
        latency: Date.now() - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      return assessment
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      await this.trackPerformance({
        model: 'risk-assessment',
        latency: Date.now() - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      throw error
    }
  }

  // Emergency handling is never cached
  async handleEmergency(
    session: TherapySession,
    trigger: EmotionAnalysis,
  ): Promise<TherapyAIResponse> {
    if (!this.isTherapyProvider(this.provider)) {
      throw new Error('Current provider does not support emergency handling')
    }

    const startTime = Date.now()
    let errorCode: string | undefined

    try {
      const response = await this.provider.handleEmergency(session, trigger)

      await this.trackPerformance({
        model: 'emergency-handler',
        latency: Date.now() - startTime,
        success: true,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      return response
    } catch (error) {
      errorCode = error instanceof Error ? error.name : 'unknown'

      await this.trackPerformance({
        model: 'emergency-handler',
        latency: Date.now() - startTime,
        success: false,
        errorCode,
        cached: false,
        optimized: false,
        requestId: generateRequestId(),
      })

      throw error
    }
  }
}

// Define interfaces for cache and provider
interface AICache {
  get: (
    messages: Message[],
    options?: AIServiceOptions,
  ) => Promise<AIResponse | null>
}

interface AIProvider {
  createChatCompletion: (
    messages: Message[],
    options?: AIServiceOptions,
  ) => Promise<AIResponse>
}
