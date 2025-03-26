import type { EmotionAnalysis, TherapySession } from '../../interfaces/therapy'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FHEService } from '../../../fhe'
import { RedisService } from '../../../services/redis'
import { PatternRecognitionService } from '../PatternRecognitionService'

describe('patternRecognitionService Integration Tests', () => {
  let service: PatternRecognitionService
  let fheService: FHEService
  let redisService: RedisService

  beforeAll(async () => {
    // Initialize real services for integration testing
    fheService = new FHEService({
      keyDirectory: './test-keys',
      scheme: 'BFV',
    })
    await fheService.initialize()

    redisService = new RedisService({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    })
    await redisService.connect()

    service = new PatternRecognitionService(fheService, redisService, {
      timeWindow: 7,
      minDataPoints: 3,
      confidenceThreshold: 0.8,
      riskFactorWeights: {
        suicidal: 1.0,
        depression: 0.8,
        anxiety: 0.7,
      },
    })
  })

  afterAll(async () => {
    // Cleanup
    await redisService.disconnect()
    await fheService.cleanup()
  })

  describe('long-term Trend Analysis', () => {
    it('should analyze encrypted emotion data over time', async () => {
      const clientId = 'test-client-1'
      const emotionData: EmotionAnalysis[] = [
        {
          timestamp: new Date('2025-03-01'),
          emotions: ['anxiety', 'stress'],
          overallSentiment: 'negative',
          riskFactors: ['work-stress'],
          requiresAttention: false,
        },
        {
          timestamp: new Date('2025-03-02'),
          emotions: ['anxiety', 'stress'],
          overallSentiment: 'negative',
          riskFactors: ['work-stress'],
          requiresAttention: false,
        },
        {
          timestamp: new Date('2025-03-03'),
          emotions: ['calm', 'relaxed'],
          overallSentiment: 'positive',
          riskFactors: [],
          requiresAttention: false,
        },
      ]

      const trends = await service.analyzeLongTermTrends(
        clientId,
        new Date('2025-03-01'),
        new Date('2025-03-03'),
        emotionData,
      )

      expect(trends).toHaveLength(1)
      expect(trends[0]).toMatchObject({
        type: 'emotion',
        significance: expect.any(Number),
        confidence: expect.any(Number),
        description: expect.stringContaining('anxiety'),
      })
    })
  })

  describe('cross-session Pattern Detection', () => {
    it('should detect patterns across multiple therapy sessions', async () => {
      const clientId = 'test-client-2'
      const sessions: TherapySession[] = [
        {
          sessionId: 'session-1',
          clientId,
          startTime: new Date('2025-03-01'),
          endTime: new Date('2025-03-01'),
          status: 'completed',
          securityLevel: 'maximum',
          emotionAnalysisEnabled: true,
        },
        {
          sessionId: 'session-2',
          clientId,
          startTime: new Date('2025-03-02'),
          endTime: new Date('2025-03-02'),
          status: 'completed',
          securityLevel: 'maximum',
          emotionAnalysisEnabled: true,
        },
      ]

      const patterns = await service.detectCrossSessionPatterns(
        clientId,
        sessions,
      )

      expect(patterns).toBeDefined()
      expect(Array.isArray(patterns)).toBe(true)
      patterns.forEach((pattern) => {
        expect(pattern).toMatchObject({
          type: expect.any(String),
          sessions: expect.arrayContaining([expect.any(String)]),
          confidence: expect.any(Number),
          impact: expect.any(String),
        })
      })
    })
  })

  describe('risk Factor Correlation', () => {
    it('should analyze correlations between risk factors', async () => {
      const clientId = 'test-client-3'
      const analyses: EmotionAnalysis[] = [
        {
          timestamp: new Date('2025-03-01'),
          emotions: ['anxiety', 'depression'],
          overallSentiment: 'negative',
          riskFactors: ['isolation', 'sleep-issues'],
          requiresAttention: true,
        },
        {
          timestamp: new Date('2025-03-02'),
          emotions: ['anxiety', 'depression'],
          overallSentiment: 'negative',
          riskFactors: ['isolation', 'sleep-issues'],
          requiresAttention: true,
        },
      ]

      const correlations = await service.analyzeRiskFactorCorrelations(
        clientId,
        analyses,
      )

      expect(correlations).toBeDefined()
      expect(Array.isArray(correlations)).toBe(true)
      correlations.forEach((correlation) => {
        expect(correlation).toMatchObject({
          primaryFactor: expect.any(String),
          correlatedFactors: expect.arrayContaining([
            expect.objectContaining({
              factor: expect.any(String),
              correlation: expect.any(Number),
            }),
          ]),
          severity: expect.any(String),
        })
      })
    })
  })

  describe('performance and Caching', () => {
    it('should cache and retrieve analysis results', async () => {
      const clientId = 'test-client-4'
      const startDate = new Date('2025-03-01')
      const endDate = new Date('2025-03-03')

      // First call - should compute and cache
      const firstResult = await service.analyzeLongTermTrends(
        clientId,
        startDate,
        endDate,
      )

      // Second call - should retrieve from cache
      const secondResult = await service.analyzeLongTermTrends(
        clientId,
        startDate,
        endDate,
      )

      expect(secondResult).toEqual(firstResult)
    })

    it('should handle concurrent analysis requests', async () => {
      const clientIds = ['client-5', 'client-6', 'client-7']
      const startDate = new Date('2025-03-01')
      const endDate = new Date('2025-03-03')

      const results = await Promise.all(
        clientIds.map((clientId) =>
          service.analyzeLongTermTrends(clientId, startDate, endDate),
        ),
      )

      expect(results).toHaveLength(clientIds.length)
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true)
      })
    })
  })

  describe('error Handling', () => {
    it('should handle FHE service failures gracefully', async () => {
      // Temporarily break FHE service
      fheService.encrypt = async () => {
        throw new Error('FHE service unavailable')
      }

      await expect(
        service.analyzeLongTermTrends('test-client', new Date(), new Date()),
      ).rejects.toThrow('FHE service unavailable')
    })

    it('should handle Redis service failures gracefully', async () => {
      // Temporarily break Redis service
      redisService.get = async () => {
        throw new Error('Redis service unavailable')
      }

      await expect(
        service.analyzeLongTermTrends('test-client', new Date(), new Date()),
      ).rejects.toThrow('Redis service unavailable')
    })
  })
})
