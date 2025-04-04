/**
 * Compliance metrics calculation for breach analytics
 */

interface ComplianceRule {
  id: string
  name: string
  weight: number
  check: (breach: any) => boolean
}

export class ComplianceMetrics {
  private static rules: ComplianceRule[] = [
    {
      id: 'notification_timing',
      name: 'Notification Timing',
      weight: 0.3,
      check: (breach) => breach.notificationDelay < 72 * 60 * 60 * 1000, // 72 hours
    },
    {
      id: 'data_protection',
      name: 'Data Protection Measures',
      weight: 0.25,
      check: (breach) =>
        breach.protectionMeasures && breach.protectionMeasures.length > 0,
    },
    {
      id: 'authority_reporting',
      name: 'Authority Reporting',
      weight: 0.2,
      check: (breach) => breach.reportedToAuthorities === true,
    },
    {
      id: 'documentation',
      name: 'Incident Documentation',
      weight: 0.15,
      check: (breach) => breach.documentationComplete === true,
    },
    {
      id: 'remediation',
      name: 'Remediation Plan',
      weight: 0.1,
      check: (breach) =>
        breach.remediationPlan && breach.remediationPlan !== '',
    },
  ]

  /**
   * Calculate compliance score for a set of breaches
   * Returns a score between 0 and 1
   */
  static async calculateScore(breaches: any[]): Promise<number> {
    if (!breaches || breaches.length === 0) {
      return 1.0 // Perfect score if no breaches
    }

    let totalScore = 0

    for (const breach of breaches) {
      let breachScore = 0

      for (const rule of this.rules) {
        if (rule.check(breach)) {
          breachScore += rule.weight
        }
      }

      totalScore += breachScore
    }

    // Average score across all breaches
    return totalScore / breaches.length
  }
}
