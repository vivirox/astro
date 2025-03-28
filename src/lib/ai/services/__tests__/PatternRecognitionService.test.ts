import type { EmotionAnalysis, TherapySession } from '../../../ai/AIService'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { IRedisService } from '../../../services/redis/types'
import { PatternRecognitionService } from '../PatternRecognitionService'
import type {
  EncryptedPattern,
  EncryptedAnalysis,
  EncryptedCorrelation,
  ExtendedFHEService,
  TrendPattern,
  CrossSessionPattern,
  RiskCorrelation,
} from '../PatternRecognitionService'

// Mock services
vi.mock('@/lib/security/fhe', () => ({
  FHEService: vi.fn().mockImplementation(() => ({
    encrypt: vi.fn().mockImplementation((data) => ({ encrypted: data })),
    decrypt: vi.fn().mockImplementation((data) => data.encrypted),
    initialize: vi.fn().mockResolvedValue(true),
  })),
}))

vi.mock('../../../services/redis', () => ({
  RedisService: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(false),
    ttl: vi.fn().mockResolvedValue(0),
    incr: vi.fn().mockResolvedValue(1),
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    isHealthy: vi.fn().mockResolvedValue(true),
    getPoolStats: vi.fn().mockResolvedValue({
      totalConnections: 1,
      activeConnections: 0,
      idleConnections: 1,
      waitingClients: 0,
    }),
  })),
}))

vi.mock('../../../utils/logger')

describe('patternRecognitionService', () => {
  let service: PatternRecognitionService
  let mockFHE: ExtendedFHEService & {
    processPatterns: Mock
    decryptPatterns: Mock
    analyzeCrossSessions: Mock
    decryptCrossSessionAnalysis: Mock
    processRiskCorrelations: Mock
    decryptRiskCorrelations: Mock
    encrypt: Mock
    decrypt: Mock
    initialize: Mock
  }
  let mockRedis: IRedisService & {
    get: Mock
    set: Mock
    del: Mock
    exists: Mock
    ttl: Mock
    incr: Mock
    sadd: Mock
    srem: Mock
    smembers: Mock
    isHealthy: Mock
    getPoolStats: Mock
    connect: Mock
    disconnect: Mock
  }

  beforeEach(() => {
    mockFHE = {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      initialize: vi.fn(),
      processPatterns: vi.fn(),
      decryptPatterns: vi.fn(),
      analyzeCrossSessions: vi.fn(),
      decryptCrossSessionAnalysis: vi.fn(),
      processRiskCorrelations: vi.fn(),
      decryptRiskCorrelations: vi.fn(),
    } as ExtendedFHEService & {
      processPatterns: Mock
      decryptPatterns: Mock
      analyzeCrossSessions: Mock
      decryptCrossSessionAnalysis: Mock
      processRiskCorrelations: Mock
      decryptRiskCorrelations: Mock
      encrypt: Mock
      decrypt: Mock
      initialize: Mock
    }

    mockFHE.encrypt.mockImplementation((data) => ({ encrypted: data }))
    mockFHE.decrypt.mockImplementation((data) => data.encrypted)
    mockFHE.initialize.mockResolvedValue(true)
    mockFHE.processPatterns.mockResolvedValue({
      data: 'encrypted-patterns',
      metadata: {
        operation: 'pattern-analysis',
        timestamp: Date.now(),
      },
    })
    mockFHE.decryptPatterns.mockResolvedValue([])
    mockFHE.analyzeCrossSessions.mockResolvedValue({
      data: 'encrypted-analysis',
      metadata: {
        operation: 'cross-session-analysis',
        timestamp: Date.now(),
      },
    })
    mockFHE.decryptCrossSessionAnalysis.mockResolvedValue([])
    mockFHE.processRiskCorrelations.mockResolvedValue({
      data: 'encrypted-correlations',
      metadata: {
        operation: 'risk-correlation',
        timestamp: Date.now(),
      },
    })
    mockFHE.decryptRiskCorrelations.mockResolvedValue([])

    mockRedis = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      ttl: vi.fn(),
      incr: vi.fn(),
      sadd: vi.fn(),
      srem: vi.fn(),
      smembers: vi.fn(),
      isHealthy: vi.fn(),
      getPoolStats: vi.fn(),
    } as IRedisService & {
      get: Mock
      set: Mock
      del: Mock
      exists: Mock
      ttl: Mock
      incr: Mock
      sadd: Mock
      srem: Mock
      smembers: Mock
      isHealthy: Mock
      getPoolStats: Mock
      connect: Mock
      disconnect: Mock
    }

    mockRedis.connect.mockResolvedValue(undefined)
    mockRedis.disconnect.mockResolvedValue(undefined)
    mockRedis.get.mockResolvedValue(null)
    mockRedis.set.mockResolvedValue(true)
    mockRedis.del.mockResolvedValue(1)
    mockRedis.exists.mockResolvedValue(false)
    mockRedis.ttl.mockResolvedValue(0)
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.sadd.mockResolvedValue(1)
    mockRedis.srem.mockResolvedValue(1)
    mockRedis.smembers.mockResolvedValue([])
    mockRedis.isHealthy.mockResolvedValue(true)
    mockRedis.getPoolStats.mockResolvedValue({
      totalConnections: 1,
      activeConnections: 0,
      idleConnections: 1,
      waitingClients: 0,
    })

    service = new PatternRecognitionService(mockFHE, mockRedis, {
      timeWindow: 7,
      minDataPoints: 5,
      confidenceThreshold: 0.8,
      riskFactorWeights: {
        suicidal: 1.0,
        depression: 0.8,
      },
    })
  })

  describe('analyzeLongTermTrends', () => {
    it('should analyze trends with sufficient data points', async () => {
      const clientId = 'test-client'
      const startDate = new Date('2025-01-01')
      const endDate = new Date('2025-01-07')

      const mockEncryptedPatterns: EncryptedPattern = {
        data: 'encrypted-patterns',
        metadata: {
          operation: 'pattern-analysis',
          timestamp: Date.now(),
        },
      }

      const mockDecryptedPatterns: TrendPattern[] = [
        {
          type: 'emotion',
          startTime: new Date('2025-01-01'),
          endTime: new Date('2025-01-07'),
          significance: 0.85,
          confidence: 0.9,
          description: 'Increasing positive emotions',
          relatedFactors: ['mood improvement'],
          recommendations: ['continue current approach'],
        },
      ]

      const expectedCacheKey = `trends:${clientId}:${startDate.toISOString()}:${endDate.toISOString()}`
      mockRedis.get.mockResolvedValue(null)
      mockFHE.processPatterns.mockResolvedValue(mockEncryptedPatterns)
      mockFHE.decryptPatterns.mockResolvedValue(mockDecryptedPatterns)

      const result = await service.analyzeLongTermTrends(
        clientId,
        startDate,
        endDate,
      )

      expect(result).toEqual(mockDecryptedPatterns)
      expect(mockFHE.processPatterns).toHaveBeenCalledWith([], {
        windowSize: 7,
        minPoints: 5,
        threshold: 0.8,
      })
      expect(mockRedis.get).toHaveBeenCalledWith(expectedCacheKey)
      expect(mockRedis.set).toHaveBeenCalledWith(
        expectedCacheKey,
        JSON.stringify(mockDecryptedPatterns),
        3600,
      )
    })

    it('should throw error when FHE processing fails', async () => {
      mockFHE.processPatterns.mockRejectedValue(
        new Error('FHE processing failed'),
      )

      await expect(
        service.analyzeLongTermTrends('client-id', new Date(), new Date()),
      ).rejects.toThrow('FHE processing failed')
    })
  })

  describe('detectCrossSessionPatterns', () => {
    it('should detect patterns across multiple sessions', async () => {
      const mockSessions: TherapySession[] = [
        {
          sessionId: 'session-1',
          clientId: 'client-1',
          therapistId: 'therapist-1',
          startTime: new Date('2025-01-01'),
          endTime: new Date('2025-01-01'),
          status: 'completed',
          securityLevel: 'hipaa',
          emotionAnalysisEnabled: true,
        },
        {
          sessionId: 'session-2',
          clientId: 'client-1',
          therapistId: 'therapist-1',
          startTime: new Date('2025-01-02'),
          endTime: new Date('2025-01-02'),
          status: 'completed',
          securityLevel: 'hipaa',
          emotionAnalysisEnabled: true,
        },
      ]

      const mockEncryptedAnalysis: EncryptedAnalysis = {
        data: 'encrypted-analysis',
        metadata: {
          operation: 'cross-session-analysis',
          timestamp: Date.now(),
        },
      }

      const mockDecryptedAnalysis: CrossSessionPattern[] = [
        {
          type: 'trigger',
          sessions: ['session-1', 'session-2'],
          pattern: 'work stress',
          frequency: 2,
          confidence: 0.85,
          impact: 'negative',
          recommendations: ['stress management techniques'],
        },
      ]

      const expectedCacheKey = `patterns:client-1:session-1:session-2`
      mockRedis.get.mockResolvedValue(null)
      mockFHE.analyzeCrossSessions.mockResolvedValue(mockEncryptedAnalysis)
      mockFHE.decryptCrossSessionAnalysis.mockResolvedValue(
        mockDecryptedAnalysis,
      )

      const result = await service.detectCrossSessionPatterns(
        'client-1',
        mockSessions,
      )

      expect(result).toEqual(mockDecryptedAnalysis)
      expect(mockFHE.analyzeCrossSessions).toHaveBeenCalledWith(
        mockSessions,
        0.8,
      )
      expect(mockRedis.get).toHaveBeenCalledWith(expectedCacheKey)
      expect(mockRedis.set).toHaveBeenCalledWith(
        expectedCacheKey,
        JSON.stringify(mockDecryptedAnalysis),
        3600,
      )
    })

    it('should filter out low confidence patterns', async () => {
      const mockDecryptedAnalysis: CrossSessionPattern[] = [
        {
          type: 'trigger',
          sessions: ['session-1'],
          pattern: 'work stress',
          frequency: 1,
          confidence: 0.7, // Below threshold
          impact: 'negative',
          recommendations: ['stress management'],
        },
      ]

      mockFHE.analyzeCrossSessions.mockResolvedValue({
        data: 'encrypted',
        metadata: {
          operation: 'cross-session-analysis',
          timestamp: Date.now(),
        },
      })
      mockFHE.decryptCrossSessionAnalysis.mockResolvedValue(
        mockDecryptedAnalysis,
      )

      const result = await service.detectCrossSessionPatterns('client-1', [])
      expect(result).toHaveLength(0)
    })
  })

  describe('analyzeRiskFactorCorrelations', () => {
    it('should analyze risk factors and their correlations', async () => {
      const mockAnalyses: EmotionAnalysis[] = [
        {
          timestamp: new Date('2025-01-01'),
          emotions: [
            {
              type: 'anxiety',
              confidence: 0.9,
              intensity: 0.7,
            },
          ],
          overallSentiment: 0.3,
          riskFactors: [
            {
              type: 'stress',
              severity: 0.6,
              confidence: 0.85,
            },
          ],
          requiresAttention: false,
        },
      ]

      const mockEncryptedCorrelations: EncryptedCorrelation = {
        data: 'encrypted-correlations',
        metadata: {
          operation: 'risk-correlation',
          timestamp: Date.now(),
        },
      }

      const mockDecryptedCorrelations: RiskCorrelation[] = [
        {
          primaryFactor: 'stress',
          correlatedFactors: [
            { factor: 'anxiety', correlation: 0.9, confidence: 0.85 },
          ],
          timeFrame: {
            start: new Date('2025-01-01'),
            end: new Date('2025-01-07'),
          },
          severity: 'medium',
          actionRequired: false,
        },
      ]

      mockRedis.get.mockResolvedValue(null)
      mockFHE.processRiskCorrelations.mockResolvedValue(
        mockEncryptedCorrelations,
      )
      mockFHE.decryptRiskCorrelations.mockResolvedValue(
        mockDecryptedCorrelations,
      )

      const result = await service.analyzeRiskFactorCorrelations(
        'client-1',
        mockAnalyses,
      )

      expect(result).toEqual(mockDecryptedCorrelations)
      expect(mockFHE.processRiskCorrelations).toHaveBeenCalledWith(
        mockAnalyses,
        {
          suicidal: 1.0,
          depression: 0.8,
        },
      )
      // Skip cache key check since it uses Date.now()
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(mockDecryptedCorrelations),
        3600,
      )
    })

    it('should handle empty analysis data', async () => {
      mockFHE.processRiskCorrelations.mockResolvedValue({
        data: 'encrypted',
        metadata: {
          operation: 'risk-correlation',
          timestamp: Date.now(),
        },
      })
      mockFHE.decryptRiskCorrelations.mockResolvedValue([])

      const result = await service.analyzeRiskFactorCorrelations('client-1', [])
      expect(result).toHaveLength(0)
    })
  })
})
