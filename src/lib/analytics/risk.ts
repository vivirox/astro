/**
 * Risk scoring utilities for breach analytics
 */

import { logger } from '@/lib/logger'

export interface RiskFactor {
  name: string
  weight: number
  score: number
  description: string
}

export class RiskScoring {
  /**
   * Calculate overall risk score based on breach data
   * Returns a score between 0 and 1
   */
  static async calculateOverallRisk(breaches: any[]): Promise<number> {
    try {
      if (!breaches || breaches.length === 0) {
        return 0 // No risk if no breaches
      }

      const factors = await this.getFactors(breaches)

      // Calculate weighted risk score
      let totalWeight = 0
      let weightedScore = 0

      for (const factor of factors) {
        weightedScore += factor.weight * factor.score
        totalWeight += factor.weight
      }

      return totalWeight > 0 ? weightedScore / totalWeight : 0
    } catch (error) {
      logger.error('Error calculating overall risk:', error)
      return 0.5 // Return moderate risk on error
    }
  }

  /**
   * Calculate daily risk score for a set of breaches
   * Returns a score between 0 and 1
   */
  static async calculateDailyRisk(breaches: any[]): Promise<number> {
    return this.calculateOverallRisk(breaches) // Same calculation, just for daily data
  }

  /**
   * Get risk factors and their scores based on breach data
   * If no breaches provided, returns default factors with neutral scores
   */
  static async getFactors(breaches: any[] = []): Promise<RiskFactor[]> {
    try {
      // Define risk factors
      const factors: RiskFactor[] = [
        {
          name: 'Breach Frequency',
          weight: 0.25,
          score: 0,
          description: 'Rate of security breaches over time',
        },
        {
          name: 'Data Sensitivity',
          weight: 0.2,
          score: 0,
          description: 'Level of sensitivity of compromised data',
        },
        {
          name: 'Breach Severity',
          weight: 0.2,
          score: 0,
          description: 'Severity level of detected breaches',
        },
        {
          name: 'Response Time',
          weight: 0.15,
          score: 0,
          description: 'Time to detect and respond to breaches',
        },
        {
          name: 'Affected Users',
          weight: 0.1,
          score: 0,
          description: 'Number of users affected by breaches',
        },
        {
          name: 'Repeated Vectors',
          weight: 0.1,
          score: 0,
          description: 'Frequency of repeated attack vectors',
        },
      ]

      if (!breaches || breaches.length === 0) {
        // If no breaches, assign neutral scores
        return factors.map((factor) => ({ ...factor, score: 0.5 }))
      }

      // Calculate scores for each factor based on breach data
      factors[0].score = this.calculateFrequencyScore(breaches)
      factors[1].score = this.calculateSensitivityScore(breaches)
      factors[2].score = this.calculateSeverityScore(breaches)
      factors[3].score = this.calculateResponseTimeScore(breaches)
      factors[4].score = this.calculateAffectedUsersScore(breaches)
      factors[5].score = this.calculateRepeatedVectorsScore(breaches)

      return factors
    } catch (error) {
      logger.error('Error calculating risk factors:', error)
      // Return default factors with neutral scores on error
      return [
        {
          name: 'Overall Risk',
          weight: 1,
          score: 0.5,
          description: 'General risk assessment',
        },
      ]
    }
  }

  // Helper methods to calculate individual factor scores

  private static calculateFrequencyScore(breaches: any[]): number {
    // Calculate breach frequency over time
    const timeSpan =
      Math.max(...breaches.map((b) => b.timestamp)) -
      Math.min(...breaches.map((b) => b.timestamp))

    // Convert to days
    const days = timeSpan / (24 * 60 * 60 * 1000) || 1
    const frequency = breaches.length / days

    // Normalize score (0-1)
    return Math.min(1, frequency / 0.5) // More than 0.5 breaches per day is maximum risk
  }

  private static calculateSensitivityScore(breaches: any[]): number {
    // Count breaches with sensitive data
    const sensitiveBreaches = breaches.filter(
      (breach) =>
        breach.dataSensitivity === 'high' || breach.piiCompromised === true,
    )

    return sensitiveBreaches.length / breaches.length
  }

  private static calculateSeverityScore(breaches: any[]): number {
    // Map severity to numeric values
    const severityMap = {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 1.0,
    }

    // Calculate average severity
    let totalSeverity = 0

    for (const breach of breaches) {
      totalSeverity += severityMap[breach.severity] || 0.5
    }

    return totalSeverity / breaches.length
  }

  private static calculateResponseTimeScore(breaches: any[]): number {
    // Calculate average response time in hours
    let totalResponseTime = 0

    for (const breach of breaches) {
      const responseTime =
        breach.responseTime ||
        (breach.resolvedAt
          ? breach.resolvedAt - breach.timestamp
          : 24 * 60 * 60 * 1000)

      totalResponseTime += responseTime
    }

    const avgResponseHours =
      totalResponseTime / breaches.length / (60 * 60 * 1000)

    // Normalize score (0-1), where 24+ hours is maximum risk
    return Math.min(1, avgResponseHours / 24)
  }

  private static calculateAffectedUsersScore(breaches: any[]): number {
    // Calculate total affected users
    let totalAffected = 0

    for (const breach of breaches) {
      totalAffected += breach.affectedUsers?.length || 0
    }

    // Normalize score (0-1), where 1000+ affected users is maximum risk
    return Math.min(1, totalAffected / 1000)
  }

  private static calculateRepeatedVectorsScore(breaches: any[]): number {
    // Count occurrences of each attack vector
    const vectorCounts = {}

    for (const breach of breaches) {
      const vector = breach.attackVector || 'unknown'
      vectorCounts[vector] = (vectorCounts[vector] || 0) + 1
    }

    // Find the most repeated vector
    const maxRepeats = Math.max(
      ...Object.values(vectorCounts).map((v) => v as number),
    )

    // Normalize score (0-1), where 5+ repetitions is maximum risk
    return Math.min(1, maxRepeats / 5)
  }
}
