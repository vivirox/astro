/**
 * Machine Learning utilities for breach analytics
 */

import { logger } from '@/lib/logger'

interface Prediction {
  value: number
  confidence: number
}

export class MachineLearning {
  /**
   * Detect anomalies in a time series of data points
   * Returns an array of anomaly scores (0-1) for each point
   */
  static async detectAnomalies(data: any[]): Promise<number[]> {
    try {
      // This is a mock implementation
      // In a real system, this would use actual ML anomaly detection

      const values = data.map((point) => point.breaches)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          values.length,
      )

      // Calculate z-scores and convert to anomaly scores
      return values.map((val) => {
        const zScore = Math.abs((val - mean) / (stdDev || 1)) // Avoid division by zero
        // Convert z-score to a 0-1 scale with sigmoid function
        return 1 / (1 + Math.exp(-zScore + 3))
      })
    } catch (error) {
      logger.error('Error in anomaly detection:', error)
      // Return neutral scores on error
      return data.map(() => 0.5)
    }
  }

  /**
   * Predict future breach counts based on historical data
   * Returns an array of predictions for each future day
   */
  static async predictBreaches(
    historicalData: any[],
    daysToPredict: number,
  ): Promise<Prediction[]> {
    try {
      // This is a mock implementation
      // In a real system, this would use actual ML forecasting models

      const recentValues = historicalData
        .slice(-14) // Use last 14 days of data
        .map((point) => point.breaches)

      const mean =
        recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length

      // Simple prediction model with slight random variance
      return Array(daysToPredict)
        .fill(0)
        .map((_, i) => {
          // Add some trend and seasonality for realistic predictions
          const trend = i * 0.05 // Slight upward trend
          const seasonal = Math.sin((i / 7) * Math.PI) * 0.2 // Weekly pattern
          const randomVariance = (Math.random() - 0.5) * 0.3

          const predicted = Math.max(
            0,
            mean + trend + seasonal + randomVariance,
          )

          return {
            value: Math.round(predicted * 10) / 10, // Round to one decimal
            confidence: 0.9 - i * 0.05, // Confidence decreases with time
          }
        })
    } catch (error) {
      logger.error('Error in breach prediction:', error)
      // Return neutral predictions on error
      return Array(daysToPredict)
        .fill(0)
        .map(() => ({
          value: 1,
          confidence: 0.5,
        }))
    }
  }
}
