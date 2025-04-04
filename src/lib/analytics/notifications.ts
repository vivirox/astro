/**
 * Notification effectiveness analysis for breach analytics
 */

import { logger } from '@/lib/logger'

export class NotificationEffectiveness {
  // Threshold for successful delivery (in milliseconds)
  private static readonly DELIVERY_THRESHOLD = 24 * 60 * 60 * 1000 // 24 hours

  // Threshold for user acknowledgment (in milliseconds)
  private static readonly ACKNOWLEDGMENT_THRESHOLD = 48 * 60 * 60 * 1000 // 48 hours

  /**
   * Calculate overall notification effectiveness for a set of breaches
   * Returns a score between 0 and 1
   */
  static async calculate(breaches: any[]): Promise<number> {
    try {
      if (!breaches || breaches.length === 0) {
        return 1.0 // Perfect score if no breaches
      }

      let totalScore = 0

      for (const breach of breaches) {
        totalScore += await this.calculateForBreach(breach)
      }

      // Average score across all breaches
      return totalScore / breaches.length
    } catch (error) {
      logger.error('Error calculating notification effectiveness:', error)
      return 0.5 // Return neutral score on error
    }
  }

  /**
   * Calculate notification effectiveness for a single day's breaches
   * Returns a score between 0 and 1
   */
  static async calculateDaily(breaches: any[]): Promise<number> {
    return this.calculate(breaches) // Same calculation, just for a day's data
  }

  /**
   * Calculate notification effectiveness for a single breach
   * Returns a score between 0 and 1
   */
  private static async calculateForBreach(breach: any): Promise<number> {
    // Default weights for different factors
    const weights = {
      deliveryRate: 0.5,
      acknowledgmentRate: 0.3,
      timeliness: 0.2,
    }

    // Calculate delivery rate
    const deliveryRate = breach.notifications?.delivered
      ? breach.notifications.delivered / (breach.notifications.total || 1)
      : 0.5

    // Calculate acknowledgment rate
    const acknowledgmentRate = breach.notifications?.acknowledged
      ? breach.notifications.acknowledged /
        (breach.notifications.delivered || 1)
      : 0.5

    // Calculate timeliness score
    const deliveryTime = breach.notifications?.averageDeliveryTime || 0
    const timelines =
      deliveryTime <= this.DELIVERY_THRESHOLD
        ? 1
        : deliveryTime <= this.ACKNOWLEDGMENT_THRESHOLD
          ? 0.5
          : 0

    // Calculate weighted score
    return (
      deliveryRate * weights.deliveryRate +
      acknowledgmentRate * weights.acknowledgmentRate +
      timelines * weights.timeliness
    )
  }
}
