/**
 * Statistical analysis utilities for breach analytics
 */

import { logger } from '@/lib/logger'

export class StatisticalAnalysis {
  /**
   * Calculate the trend of a time series using simple linear regression
   * Returns the slope of the trend line (positive value indicates increasing trend)
   */
  static calculateTrend(timeSeries: number[]): number {
    try {
      if (!timeSeries || timeSeries.length < 2) {
        return 0 // No trend with insufficient data
      }

      // Create x-coordinates (time indices)
      const x = Array.from({ length: timeSeries.length }, (_, i) => i)

      // Calculate means
      const meanX = x.reduce((sum, val) => sum + val, 0) / x.length
      const meanY =
        timeSeries.reduce((sum, val) => sum + val, 0) / timeSeries.length

      // Calculate linear regression coefficients
      let numerator = 0
      let denominator = 0

      for (let i = 0; i < x.length; i++) {
        numerator += (x[i] - meanX) * (timeSeries[i] - meanY)
        denominator += Math.pow(x[i] - meanX, 2)
      }

      // Calculate slope (avoid division by zero)
      const slope = denominator !== 0 ? numerator / denominator : 0

      // Normalize slope to be between -1 and 1
      const maxAbsValue = Math.max(...timeSeries.map((val) => Math.abs(val)))
      return maxAbsValue > 0 ? slope / maxAbsValue : 0
    } catch (error) {
      logger.error('Error calculating trend:', error)
      return 0 // Return no trend on error
    }
  }

  /**
   * Calculate moving average of a time series
   * @param timeSeries The time series data
   * @param windowSize The size of the moving window
   */
  static calculateMovingAverage(
    timeSeries: number[],
    windowSize: number = 3,
  ): number[] {
    try {
      if (!timeSeries || timeSeries.length < windowSize) {
        return timeSeries // Return original series if insufficient data
      }

      const result: number[] = []

      for (let i = 0; i < timeSeries.length - windowSize + 1; i++) {
        const window = timeSeries.slice(i, i + windowSize)
        const average = window.reduce((sum, val) => sum + val, 0) / windowSize
        result.push(average)
      }

      // Pad the beginning with the first calculated average
      const padding = Array(windowSize - 1).fill(result[0])

      return [...padding, ...result]
    } catch (error) {
      logger.error('Error calculating moving average:', error)
      return timeSeries // Return original series on error
    }
  }

  /**
   * Detect outliers in a time series using z-scores
   * @param timeSeries The time series data
   * @param threshold Z-score threshold for outlier detection (default: 2.5)
   * @returns Indices of outliers in the time series
   */
  static detectOutliers(
    timeSeries: number[],
    threshold: number = 2.5,
  ): number[] {
    try {
      if (!timeSeries || timeSeries.length < 3) {
        return [] // No outliers with insufficient data
      }

      // Calculate mean and standard deviation
      const mean =
        timeSeries.reduce((sum, val) => sum + val, 0) / timeSeries.length
      const stdDev = Math.sqrt(
        timeSeries.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          timeSeries.length,
      )

      // Find outliers (points with z-score above threshold)
      const outliers: number[] = []

      for (let i = 0; i < timeSeries.length; i++) {
        const zScore = Math.abs((timeSeries[i] - mean) / (stdDev || 1)) // Avoid division by zero
        if (zScore > threshold) {
          outliers.push(i)
        }
      }

      return outliers
    } catch (error) {
      logger.error('Error detecting outliers:', error)
      return [] // Return no outliers on error
    }
  }
}
