import type { EventType } from '@/lib/services/analytics/AnalyticsService'
import {
  AnalyticsService,
  EventPriority,
} from '@/lib/services/analytics/AnalyticsService'

const analyticsService = new AnalyticsService()

export function useAnalytics() {
  const trackEvent = async (data: {
    type: string
    properties: Record<string, unknown>
    priority?: EventPriority
  }) => {
    try {
      await analyticsService.trackEvent({
        type: data.type as EventType,
        priority: data.priority || EventPriority.NORMAL,
        properties: data.properties,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Failed to track analytics event:', error)
    }
  }

  const trackMetric = async (data: {
    name: string
    value: number
    tags?: Record<string, string>
  }) => {
    try {
      await analyticsService.trackMetric({
        name: data.name,
        value: data.value,
        tags: data.tags || {},
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error('Failed to track analytics metric:', error)
    }
  }

  return {
    trackEvent,
    trackMetric,
  }
}
