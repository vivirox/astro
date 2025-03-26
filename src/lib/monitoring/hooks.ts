import { useCallback, useEffect } from 'react'
import { MonitoringService } from './service'

export function useMonitoring() {
  useEffect(() => {
    const monitoringService = MonitoringService.getInstance()
    monitoringService.initialize().catch((error) => {
      console.error('Failed to initialize monitoring service:', error)
    })
  }, [])

  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      // @ts-ignore - Faro is loaded globally
      if (window.faro) {
        // @ts-ignore - Faro is loaded globally
        window.faro.api.pushEvent(eventName, properties)
      }
    },
    [],
  )

  const trackError = useCallback(
    (error: Error, context?: Record<string, any>) => {
      // @ts-ignore - Faro is loaded globally
      if (window.faro) {
        // @ts-ignore - Faro is loaded globally
        window.faro.api.pushError(error, context)
      }
    },
    [],
  )

  const trackMetric = useCallback(
    (name: string, value: number, unit?: string) => {
      // @ts-ignore - Faro is loaded globally
      if (window.faro) {
        // @ts-ignore - Faro is loaded globally
        window.faro.api.pushMeasurement(name, {
          value,
          unit,
        })
      }
    },
    [],
  )

  return {
    trackEvent,
    trackError,
    trackMetric,
  }
}
