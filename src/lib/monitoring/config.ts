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
  database: {
    enabled: boolean
    debugMode: boolean
    connectionMetricsInterval: number
    queryMetricsInterval: number
    resourceMetricsInterval: number
    maxConnectionPercent: number
    slowQueryThreshold: number
    cpuUtilizationThreshold: number
    memoryUtilizationThreshold: number
    diskSpaceThreshold: number
    alertsEnabled: boolean
    alertChannels: {
      slack: boolean
      email: boolean
      pagerduty: boolean
    }
  }
}

const defaultConfig: MonitoringConfig = {
  grafana: {
    url: 'https://grafana.example.com',
    apiKey: '',
    orgId: '',
    enableRUM: true,
    rumApplicationName: 'astro-app',
    rumSamplingRate: 0.5, // 50% sampling
  },
  metrics: {
    enablePerformanceMetrics: true,
    slowRequestThreshold: 500, // ms
    errorRateThreshold: 0.01, // 1%
    resourceUtilizationThreshold: 0.8, // 80%
  },
  alerts: {
    enableAlerts: false,
    slackWebhookUrl: undefined,
    emailRecipients: [],
  },
  database: {
    enabled: true,
    debugMode: process.env.NODE_ENV !== 'production',
    connectionMetricsInterval: 60000, // 1 minute
    queryMetricsInterval: 300000, // 5 minutes
    resourceMetricsInterval: 120000, // 2 minutes
    maxConnectionPercent: 80,
    slowQueryThreshold: 1000, // 1 second
    cpuUtilizationThreshold: 85,
    memoryUtilizationThreshold: 85,
    diskSpaceThreshold: 20, // 20% free space left
    alertsEnabled: true,
    alertChannels: {
      slack: true,
      email: true,
      pagerduty: process.env.NODE_ENV === 'production', // Only enable PagerDuty in production
    },
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
      database: {
        ...defaultConfig.database,
        enabled: process.env.DATABASE_MONITORING_ENABLED !== 'false',
        connectionMetricsInterval: parseInt(
          process.env.DATABASE_CONNECTION_METRICS_INTERVAL ||
            defaultConfig.database.connectionMetricsInterval.toString(),
          10,
        ),
        queryMetricsInterval: parseInt(
          process.env.DATABASE_QUERY_METRICS_INTERVAL ||
            defaultConfig.database.queryMetricsInterval.toString(),
          10,
        ),
        resourceMetricsInterval: parseInt(
          process.env.DATABASE_RESOURCE_METRICS_INTERVAL ||
            defaultConfig.database.resourceMetricsInterval.toString(),
          10,
        ),
      },
    }
  } catch (error) {
    logger.error('Failed to load monitoring configuration', {
      error: error instanceof Error ? error.message : String(error),
    })
    return defaultConfig
  }
}

// Export the config singleton
export const config = getMonitoringConfig()
