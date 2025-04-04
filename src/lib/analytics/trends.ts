/**
 * Security trends analysis for breach analytics
 */

import { logger } from '@/lib/logger'
import type { RiskFactor } from '@/lib/analytics/risk'
import { StatisticalAnalysis } from '@/lib/analytics/statistics'

type TrendDirection = 'increasing' | 'decreasing' | 'stable'

export class SecurityTrends {
  // Threshold for trend significance
  private static readonly TREND_THRESHOLD = 0.05

  /**
   * Analyze trends for risk factors
   * Returns trend direction for each factor
   */
  static async analyze(factors: RiskFactor[]): Promise<TrendDirection[]> {
    try {
      // In a real system, this would use historical data for each factor
      // For this mock implementation, we'll generate trend directions
      // based on factor scores with some randomness

      return factors.map((factor) => {
        // Add a random component to the trend
        const randomComponent = (Math.random() - 0.5) * 0.2

        // Use the factor score to lean towards a trend direction
        // Higher scores tend to increase, lower scores tend to decrease
        const trendValue = factor.score - 0.5 + randomComponent

        // Convert to trend direction
        if (Math.abs(trendValue) < this.TREND_THRESHOLD) {
          return 'stable'
        } else {
          return trendValue > 0 ? 'increasing' : 'decreasing'
        }
      })
    } catch (error) {
      logger.error('Error analyzing security trends:', error)
      // Return stable trends on error
      return factors.map(() => 'stable')
    }
  }

  /**
   * Analyze historical security data for trends
   * @param historicalData Array of data points with timestamps and metric values
   * @param metricName Name of the metric to analyze
   */
  static analyzeHistoricalTrend(
    historicalData: Array<{ timestamp: number; [key: string]: any }>,
    metricName: string,
  ): { trendDirection: TrendDirection; trendValue: number } {
    try {
      if (!historicalData || historicalData.length < 2) {
        return { trendDirection: 'stable', trendValue: 0 }
      }

      // Sort data by timestamp
      const sortedData = [...historicalData].sort(
        (a, b) => a.timestamp - b.timestamp,
      )

      // Extract metric values
      const values = sortedData.map((item) =>
        typeof item[metricName] === 'number' ? item[metricName] : 0,
      )

      // Calculate trend
      const trendValue = StatisticalAnalysis.calculateTrend(values)

      // Determine trend direction
      let trendDirection: TrendDirection = 'stable'
      if (Math.abs(trendValue) < this.TREND_THRESHOLD) {
        trendDirection = 'stable'
      } else {
        trendDirection = trendValue > 0 ? 'increasing' : 'decreasing'
      }

      return { trendDirection, trendValue }
    } catch (error) {
      logger.error(`Error analyzing historical trend for ${metricName}:`, error)
      return { trendDirection: 'stable', trendValue: 0 }
    }
  }

  /**
   * Identify seasonality patterns in security data
   * @param historicalData Array of data points with timestamps and metric values
   * @param metricName Name of the metric to analyze
   * @param periodDays Length of potential seasonal period in days
   */
  static identifySeasonality(
    historicalData: Array<{ timestamp: number; [key: string]: any }>,
    metricName: string,
    periodDays: number = 7,
  ): boolean {
    try {
      if (!historicalData || historicalData.length < periodDays * 2) {
        return false // Need at least 2 full periods of data
      }

      // Sort data by timestamp
      const sortedData = [...historicalData].sort(
        (a, b) => a.timestamp - b.timestamp,
      )

      // Extract metric values
      const values = sortedData.map((item) =>
        typeof item[metricName] === 'number' ? item[metricName] : 0,
      )

      // Calculate autocorrelation at the period lag
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length

      let numerator = 0
      let denominator = 0

      for (let i = 0; i < values.length - periodDays; i++) {
        numerator += (values[i] - mean) * (values[i + periodDays] - mean)
        denominator += Math.pow(values[i] - mean, 2)
      }

      const autocorrelation = denominator !== 0 ? numerator / denominator : 0

      // Check if autocorrelation is significant
      return autocorrelation > 0.3
    } catch (error) {
      logger.error(`Error identifying seasonality for ${metricName}:`, error)
      return false
    }
  }
}
