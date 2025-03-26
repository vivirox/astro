import type { EmotionAnalysis, TherapySession } from '../../interfaces/therapy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FHEService } from '../../../fhe'
import { RedisService } from '../../../services/redis'
import { PatternRecognitionService } from '../PatternRecognitionService'

// Mock services
vi.mock('../../../fhe')
vi.mock('../../../services/redis')
vi.mock('../../../utils/logger')

describe('patternRecognitionService', () => {
  let service: PatternRecognitionService
  let mockFHE: jest.Mocked<FHEService>
  let mockRedis: jest.Mocked<RedisService>

  beforeEach(() => {
    mockFHE = new FHEService({} as any) as jest.Mocked<FHEService>
    mockRedis = new RedisService('') as jest.Mocked<RedisService>

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

      const mockEmotionData = [
        {
          timestamp: new Date('2025-01-01'),
          emotions: ['joy'],
          confidence: 0.9,
        },
        {
          timestamp: new Date('2025-01-02'),
          emotions: ['sadness'],
          confidence: 0.85,
        },
      ]

      const mockEncryptedPatterns = 'encrypted-patterns'
      const mockDecryptedPatterns = [
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

      mockRedis.get.mockResolvedValue(null)
      mockFHE.processPatterns.mockResolvedValue(mockEncryptedPatterns)
      mockFHE.decryptPatterns.mockResolvedValue(mockDecryptedPatterns)

      const result = await service.analyzeLongTermTrends(
        clientId,
        startDate,
        endDate,
      )

      expect(result).toEqual(mockDecryptedPatterns)
      expect(mockFHE.processPatterns).toHaveBeenCalledWith(expect.any(Array), {
        windowSize: 7,
        minPoints: 5,
        threshold: 0.8,
      })
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
          startTime: new Date('2025-01-01'),
          endTime: new Date('2025-01-01'),
          status: 'completed',
          securityLevel: 'maximum',
          emotionAnalysisEnabled: true,
        },
        {
          sessionId: 'session-2',
          clientId: 'client-1',
          startTime: new Date('2025-01-02'),
          endTime: new Date('2025-01-02'),
          status: 'completed',
          securityLevel: 'maximum',
          emotionAnalysisEnabled: true,
        },
      ]

      const mockEncryptedAnalysis = 'encrypted-analysis'
      const mockDecryptedAnalysis = [
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
        expect.any(Array),
        0.8,
      )
    })

    it('should filter out low confidence patterns', async () => {
      const mockDecryptedAnalysis = [
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

      mockFHE.analyzeCrossSessions.mockResolvedValue('encrypted')
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
          emotions: ['anxiety'],
          overallSentiment: 'negative',
          riskFactors: ['stress'],
          requiresAttention: false,
        },
      ]

      const mockEncryptedCorrelations = 'encrypted-correlations'
      const mockDecryptedCorrelations = [
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
        expect.any(Array),
        expect.any(Object),
      )
    })

    it('should handle empty analysis data', async () => {
      mockFHE.processRiskCorrelations.mockResolvedValue('encrypted')
      mockFHE.decryptRiskCorrelations.mockResolvedValue([])

      const result = await service.analyzeRiskFactorCorrelations('client-1', [])
      expect(result).toHaveLength(0)
    })
  })
})
