import type { EmotionAnalysis, TherapySession } from '../../ai/AIService'
import type { FHEService } from '../../fhe'
import type { IRedisService } from '../../services/redis/types'

export interface TrendPattern {
  type: string
  startTime: Date
  endTime: Date
  significance: number
  confidence: number
  description: string
  relatedFactors: string[]
  recommendations: string[]
}

export interface CrossSessionPattern {
  type: string
  sessions: string[]
  pattern: string
  frequency: number
  confidence: number
  impact: string
  recommendations: string[]
}

export interface RiskCorrelation {
  primaryFactor: string
  correlatedFactors: Array<{
    factor: string
    correlation: number
    confidence: number
  }>
  timeFrame: {
    start: Date
    end: Date
  }
  severity: string
  actionRequired: boolean
}

// Types for encrypted data
export interface EncryptedPattern {
  data: string
  metadata: {
    operation: string
    timestamp: number
  }
}

export interface EncryptedAnalysis {
  data: string
  metadata: {
    operation: string
    timestamp: number
  }
}

export interface EncryptedCorrelation {
  data: string
  metadata: {
    operation: string
    timestamp: number
  }
}

// Extend FHEService interface with required methods
export interface ExtendedFHEService extends FHEService {
  processPatterns(
    data: unknown[],
    options: {
      windowSize: number
      minPoints: number
      threshold: number
    },
  ): Promise<EncryptedPattern>
  decryptPatterns(encryptedData: EncryptedPattern): Promise<TrendPattern[]>
  analyzeCrossSessions(
    sessions: TherapySession[],
    threshold: number,
  ): Promise<EncryptedAnalysis>
  decryptCrossSessionAnalysis(
    encryptedData: EncryptedAnalysis,
  ): Promise<CrossSessionPattern[]>
  processRiskCorrelations(
    analyses: EmotionAnalysis[],
    weights: Record<string, number>,
  ): Promise<EncryptedCorrelation>
  decryptRiskCorrelations(
    encryptedData: EncryptedCorrelation,
  ): Promise<RiskCorrelation[]>
}

export class PatternRecognitionService {
  constructor(
    private readonly fheService: ExtendedFHEService,
    private readonly redisService: IRedisService,
    private readonly config: {
      timeWindow: number
      minDataPoints: number
      confidenceThreshold: number
      riskFactorWeights: Record<string, number>
    },
  ) {}

  async analyzeLongTermTrends(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrendPattern[]> {
    const cacheKey = `trends:${clientId}:${startDate.toISOString()}:${endDate.toISOString()}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const encryptedPatterns = await this.fheService.processPatterns([], {
      windowSize: this.config.timeWindow,
      minPoints: this.config.minDataPoints,
      threshold: this.config.confidenceThreshold,
    })
    const results = await this.fheService.decryptPatterns(encryptedPatterns)
    await this.redisService.set(cacheKey, JSON.stringify(results), 3600)
    return results
  }

  async detectCrossSessionPatterns(
    clientId: string,
    sessions: TherapySession[],
  ): Promise<CrossSessionPattern[]> {
    const cacheKey = `patterns:${clientId}:${sessions.map((s) => s.sessionId).join(':')}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const encryptedAnalysis = await this.fheService.analyzeCrossSessions(
      sessions,
      this.config.confidenceThreshold,
    )
    const patterns =
      await this.fheService.decryptCrossSessionAnalysis(encryptedAnalysis)
    const results = patterns.filter(
      (pattern: CrossSessionPattern) =>
        pattern.confidence >= this.config.confidenceThreshold,
    )
    await this.redisService.set(cacheKey, JSON.stringify(results), 3600)
    return results
  }

  async analyzeRiskFactorCorrelations(
    clientId: string,
    analyses: EmotionAnalysis[],
  ): Promise<RiskCorrelation[]> {
    const cacheKey = `correlations:${clientId}:${Date.now()}`
    const cached = await this.redisService.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const encryptedCorrelations = await this.fheService.processRiskCorrelations(
      analyses,
      this.config.riskFactorWeights,
    )
    const results = await this.fheService.decryptRiskCorrelations(
      encryptedCorrelations,
    )
    await this.redisService.set(cacheKey, JSON.stringify(results), 3600)
    return results
  }
}
