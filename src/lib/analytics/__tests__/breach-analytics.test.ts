import { ComplianceMetrics } from '@/lib/analytics/compliance'
import { MachineLearning } from '@/lib/analytics/ml'
import { NotificationEffectiveness } from '@/lib/analytics/notifications'
import { RiskScoring } from '@/lib/analytics/risk'
import { StatisticalAnalysis } from '@/lib/analytics/statistics'
import { SecurityTrends } from '@/lib/analytics/trends'
import { FHE } from '@/lib/fhe'
import { redis } from '@/lib/redis'
import { BreachNotificationSystem } from '@/lib/security/breach-notification'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BreachAnalytics } from '../breach-analytics'

// Mock dependencies
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    keys: vi.fn(),
  },
}))

vi.mock('@/lib/fhe', () => ({
  FHE: {
    encrypt: vi.fn(),
  },
}))

vi.mock('@/lib/security/breach-notification', () => ({
  BreachNotificationSystem: {
    listRecentBreaches: vi.fn(),
  },
}))

vi.mock('@/lib/analytics/ml', () => ({
  MachineLearning: {
    detectAnomalies: vi.fn(),
    predictBreaches: vi.fn(),
  },
}))

vi.mock('@/lib/analytics/risk', () => ({
  RiskScoring: {
    calculateOverallRisk: vi.fn(),
    calculateDailyRisk: vi.fn(),
    getFactors: vi.fn(),
  },
}))

vi.mock('@/lib/analytics/notifications', () => ({
  NotificationEffectiveness: {
    calculate: vi.fn(),
    calculateDaily: vi.fn(),
  },
}))

vi.mock('@/lib/analytics/compliance', () => ({
  ComplianceMetrics: {
    calculateScore: vi.fn(),
  },
}))

vi.mock('@/lib/analytics/trends', () => ({
  SecurityTrends: {
    analyze: vi.fn(),
  },
}))

vi.mock('@/lib/analytics/statistics', () => ({
  StatisticalAnalysis: {
    calculateTrend: vi.fn(),
  },
}))

describe('breachAnalytics', () => {
  const mockTimeframe = {
    from: new Date('2025-03-01'),
    to: new Date('2025-03-07'),
  }

  const mockBreaches = [
    {
      id: 'breach_1',
      type: 'unauthorized_access',
      severity: 'high',
      timestamp: new Date('2025-03-02').getTime(),
      affectedUsers: ['user1', 'user2'],
      notificationStatus: 'completed',
    },
    {
      id: 'breach_2',
      type: 'data_leak',
      severity: 'critical',
      timestamp: new Date('2025-03-03').getTime(),
      affectedUsers: ['user3', 'user4', 'user5'],
      notificationStatus: 'completed',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    ;(BreachNotificationSystem.listRecentBreaches as any).mockResolvedValue(
      mockBreaches,
    )
    ;(redis.get as any).mockResolvedValue(
      JSON.stringify({
        completedAt: Date.now(),
      }),
    )
    ;(RiskScoring.calculateOverallRisk as any).mockResolvedValue(0.75)
    ;(RiskScoring.calculateDailyRisk as any).mockResolvedValue(0.65)
    ;(ComplianceMetrics.calculateScore as any).mockResolvedValue(0.98)
    ;(NotificationEffectiveness.calculate as any).mockResolvedValue(0.95)
    ;(NotificationEffectiveness.calculateDaily as any).mockResolvedValue(0.92)
    ;(MachineLearning.detectAnomalies as any).mockResolvedValue([0.1, 0.2])
    ;(MachineLearning.predictBreaches as any).mockResolvedValue([
      { value: 3, confidence: 0.8 },
      { value: 4, confidence: 0.7 },
    ])
    ;(RiskScoring.getFactors as any).mockResolvedValue([
      { name: 'factor1', weight: 0.8, score: 0.9 },
      { name: 'factor2', weight: 0.6, score: 0.7 },
    ])
    ;(SecurityTrends.analyze as any).mockResolvedValue(['increasing', 'stable'])
    ;(StatisticalAnalysis.calculateTrend as any).mockReturnValue(0.15)
    ;(FHE.encrypt as any).mockResolvedValue('encrypted_data')
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('generateMetrics', () => {
    it('should generate breach metrics for the given timeframe', async () => {
      const metrics = await BreachAnalytics.generateMetrics(mockTimeframe)

      expect(metrics).toEqual({
        totalBreaches: 2,
        bySeverity: {
          high: 1,
          critical: 1,
        },
        byType: {
          unauthorized_access: 1,
          data_leak: 1,
        },
        averageResponseTime: expect.any(Number),
        riskScore: 0.75,
        complianceScore: 0.98,
        notificationEffectiveness: 0.95,
      })

      expect(BreachNotificationSystem.listRecentBreaches).toHaveBeenCalled()
      expect(RiskScoring.calculateOverallRisk).toHaveBeenCalledWith(
        mockBreaches,
      )
      expect(ComplianceMetrics.calculateScore).toHaveBeenCalledWith(
        mockBreaches,
      )
      expect(NotificationEffectiveness.calculate).toHaveBeenCalledWith(
        mockBreaches,
      )
    })

    it('should handle empty breach list', async () => {
      ;(BreachNotificationSystem.listRecentBreaches as any).mockResolvedValue(
        [],
      )

      const metrics = await BreachAnalytics.generateMetrics(mockTimeframe)

      expect(metrics).toEqual({
        totalBreaches: 0,
        bySeverity: {},
        byType: {},
        averageResponseTime: 0,
        riskScore: 0.75,
        complianceScore: 0.98,
        notificationEffectiveness: 0.95,
      })
    })
  })

  describe('analyzeTrends', () => {
    it('should analyze breach trends over time', async () => {
      const trends = await BreachAnalytics.analyzeTrends(mockTimeframe)

      expect(trends).toHaveLength(7) // 7 days
      expect(trends[0]).toEqual({
        timestamp: mockTimeframe.from.getTime(),
        breaches: expect.any(Number),
        affectedUsers: expect.any(Number),
        notificationRate: 0.92,
        responseTime: expect.any(Number),
        riskScore: 0.65,
        anomalyScore: expect.any(Number),
      })

      expect(MachineLearning.detectAnomalies).toHaveBeenCalled()
      expect(NotificationEffectiveness.calculateDaily).toHaveBeenCalled()
      expect(RiskScoring.calculateDailyRisk).toHaveBeenCalled()
    })
  })

  describe('predictBreaches', () => {
    it('should predict future breaches', async () => {
      const predictions = await BreachAnalytics.predictBreaches(7)

      expect(predictions).toHaveLength(2)
      expect(predictions[0]).toEqual({
        timestamp: expect.any(Number),
        predictedBreaches: 3,
        confidence: 0.8,
        factors: ['factor1'],
      })

      expect(MachineLearning.predictBreaches).toHaveBeenCalled()
      expect(RiskScoring.getFactors).toHaveBeenCalled()
    })
  })

  describe('analyzeRiskFactors', () => {
    it('should analyze risk factors and their trends', async () => {
      const factors = await BreachAnalytics.analyzeRiskFactors()

      expect(factors).toEqual([
        {
          name: 'factor1',
          weight: 0.8,
          score: 0.9,
          trend: 'increasing',
        },
        {
          name: 'factor2',
          weight: 0.6,
          score: 0.7,
          trend: 'stable',
        },
      ])

      expect(RiskScoring.getFactors).toHaveBeenCalled()
      expect(SecurityTrends.analyze).toHaveBeenCalled()
    })
  })

  describe('generateInsights', () => {
    it('should generate security insights based on metrics and trends', async () => {
      const insights = await BreachAnalytics.generateInsights()

      expect(insights).toContainEqual({
        type: 'critical_breaches',
        severity: 'critical',
        description: expect.stringContaining('critical breaches detected'),
        recommendation: expect.stringContaining('Review security measures'),
        relatedMetrics: ['bySeverity', 'riskScore'],
      })

      expect(insights).toContainEqual({
        type: 'response_time',
        severity: 'medium',
        description: 'Response time is showing an increasing trend',
        recommendation: expect.stringContaining(
          'Review incident response procedures',
        ),
        relatedMetrics: ['averageResponseTime'],
      })
    })

    it('should include notification effectiveness insights when below threshold', async () => {
      ;(NotificationEffectiveness.calculate as any).mockResolvedValue(0.94)

      const insights = await BreachAnalytics.generateInsights()

      expect(insights).toContainEqual({
        type: 'notification_effectiveness',
        severity: 'high',
        description: expect.stringContaining('below 95%'),
        recommendation: expect.stringContaining(
          'Review notification delivery system',
        ),
        relatedMetrics: ['notificationEffectiveness', 'averageResponseTime'],
      })
    })

    it('should include compliance insights when below threshold', async () => {
      ;(ComplianceMetrics.calculateScore as any).mockResolvedValue(0.97)

      const insights = await BreachAnalytics.generateInsights()

      expect(insights).toContainEqual({
        type: 'compliance',
        severity: 'high',
        description: 'Compliance score is below threshold',
        recommendation: 'Review and address compliance gaps',
        relatedMetrics: ['complianceScore'],
      })
    })
  })

  describe('generateReport', () => {
    it('should generate a comprehensive analytics report', async () => {
      const report = await BreachAnalytics.generateReport(mockTimeframe)

      expect(report).toEqual({
        timeframe: {
          from: mockTimeframe.from.toISOString(),
          to: mockTimeframe.to.toISOString(),
        },
        metrics: {
          totalBreaches: 2,
          bySeverity: {
            high: 1,
            critical: 1,
          },
          byType: {
            unauthorized_access: 1,
            data_leak: 1,
          },
          averageResponseTime: expect.any(Number),
          riskScore: 0.75,
          complianceScore: 0.98,
          notificationEffectiveness: 0.95,
          encryptedData: 'encrypted_data',
        },
        trends: expect.any(Array),
        predictions: expect.any(Array),
        riskFactors: expect.any(Array),
        insights: expect.any(Array),
        generatedAt: expect.any(String),
      })

      expect(FHE.encrypt).toHaveBeenCalled()
    })

    it('should handle errors during report generation', async () => {
      ;(BreachNotificationSystem.listRecentBreaches as any).mockRejectedValue(
        new Error('Failed to fetch breaches'),
      )

      await expect(
        BreachAnalytics.generateReport(mockTimeframe),
      ).rejects.toThrow('Failed to fetch breaches')
    })
  })
})
