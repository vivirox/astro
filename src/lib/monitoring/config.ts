import { getLogger } from '../logging'

const logger = getLogger()

export interface MonitoringConfig {
  grafana: {
    url: string
    apiKey: string
    orgId: string
    enableRUM: boolean
    rumApplicationName: string
    rumSamplingRate: number
  }
  metrics: {
    enablePerformanceMetrics: boolean
    slowRequestThreshold: number
    errorRateThreshold: number
    resourceUtilizationThreshold: number
  }
  alerts: {
    enableAlerts: boolean
    slackWebhookUrl?: string
    emailRecipients?: string[]
  }
}

const defaultConfig: MonitoringConfig = {
  grafana: {
    url: process.env.GRAFANA_URL || 'https://grafana.gradiantascent.com',
    apiKey: process.env.GRAFANA_API_KEY || '',
    orgId: process.env.GRAFANA_ORG_ID || '',
    enableRUM: true,
    rumApplicationName: 'gradiant-astro',
    rumSamplingRate: 1.0, // 100% sampling in production
  },
  metrics: {
    enablePerformanceMetrics: true,
    slowRequestThreshold: 500, // ms
    errorRateThreshold: 0.01, // 1%
    resourceUtilizationThreshold: 0.8, // 80%
  },
  alerts: {
    enableAlerts: true,
    slackWebhookUrl: process.env.MONITORING_SLACK_WEBHOOK,
    emailRecipients: process.env.MONITORING_EMAIL_RECIPIENTS?.split(','),
  },
}

export function getMonitoringConfig(): MonitoringConfig {
  try {
    return {
      ...defaultConfig,
      grafana: {
        ...defaultConfig.grafana,
        apiKey: process.env.GRAFANA_API_KEY || defaultConfig.grafana.apiKey,
        orgId: process.env.GRAFANA_ORG_ID || defaultConfig.grafana.orgId,
      },
    }
  } catch (error) {
    logger.error('Failed to load monitoring configuration', error)
    return defaultConfig
  }
}
