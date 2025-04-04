/**
 * Log Visualization Service
 *
 * This service handles the creation and configuration of log visualization dashboards,
 * integrating with Kibana to provide real-time visibility into application logs.
 */

import { getLogger } from '@/lib/logging'
import type { Dashboard, DashboardPanel } from './kibana-dashboard'
import KibanaDashboardGenerator from './kibana-dashboard'

const logger = getLogger({ prefix: 'log-visualization' })

export interface LogVisualizationConfig {
  kibanaUrl: string
  username?: string
  password?: string
  apiKey?: string
  spaceId?: string
  defaultTimeRange?: {
    from: string
    to: string
  }
  refreshInterval?: string
}

export interface VisualizationOptions {
  title?: string
  description?: string
  timeRange?: {
    from: string
    to: string
  }
  refreshInterval?: string
  darkMode?: boolean
}

export class LogVisualization {
  private config: LogVisualizationConfig
  private dashboardGenerator: KibanaDashboardGenerator
  private static instance: LogVisualization

  private constructor(config: LogVisualizationConfig) {
    this.config = {
      ...config,
      defaultTimeRange: config.defaultTimeRange || {
        from: 'now-24h',
        to: 'now',
      },
      refreshInterval: config.refreshInterval || '30s',
    }

    this.dashboardGenerator = new KibanaDashboardGenerator({
      kibanaUrl: this.config.kibanaUrl,
      username: this.config.username,
      password: this.config.password,
      apiKey: this.config.apiKey,
      spaceId: this.config.spaceId,
    })

    logger.info('Log visualization service initialized', {
      kibanaUrl: this.config.kibanaUrl,
      spaceId: this.config.spaceId || 'default',
    })
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config: LogVisualizationConfig): LogVisualization {
    if (!LogVisualization.instance) {
      LogVisualization.instance = new LogVisualization(config)
    }
    return LogVisualization.instance
  }

  /**
   * Deploy all standard dashboards
   */
  public async deployStandardDashboards(): Promise<boolean> {
    try {
      await this.dashboardGenerator.deployStandardDashboards()
      logger.info('All standard dashboards deployed')
      return true
    } catch (error) {
      logger.error('Failed to deploy standard dashboards', { error })
      return false
    }
  }

  /**
   * Generate embedded dashboard URL
   */
  public generateEmbedUrl(
    dashboardId: string,
    options: VisualizationOptions = {},
  ): string {
    const timeFrom =
      options.timeRange?.from || this.config.defaultTimeRange?.from
    const timeTo = options.timeRange?.to || this.config.defaultTimeRange?.to
    const refresh = options.refreshInterval || this.config.refreshInterval
    const theme = options.darkMode ? 'dark' : 'light'

    const spacePrefix = this.config.spaceId ? `/s/${this.config.spaceId}` : ''
    const baseUrl = `${this.config.kibanaUrl}${spacePrefix}/app/dashboards#/view/${dashboardId}`

    const params = new URLSearchParams({
      _g: JSON.stringify({
        time: { from: timeFrom, to: timeTo },
        refreshInterval: { pause: false, value: refresh },
      }),
      theme: theme,
      embed: 'true',
    })

    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Create a custom dashboard
   */
  public async createCustomDashboard(
    id: string,
    title: string,
    description: string,
    panels: DashboardPanel[],
    timeRange?: { from: string; to: string },
  ): Promise<boolean> {
    const dashboard: Dashboard = {
      id,
      title,
      description,
      timeRange: timeRange || this.config.defaultTimeRange,
      panels,
    }

    try {
      const result = await this.dashboardGenerator.createDashboard(dashboard)
      if (result) {
        logger.info(`Custom dashboard created: ${title}`)
      } else {
        logger.warn(`Failed to create custom dashboard: ${title}`)
      }
      return result
    } catch (error) {
      logger.error(`Error creating custom dashboard: ${title}`, { error })
      return false
    }
  }

  /**
   * Create a visualization panel for API monitoring
   */
  public createApiMonitoringPanel(endpoint: string): DashboardPanel {
    return {
      id: `api-${endpoint.replace(/\//g, '-')}-panel`,
      type: 'visualization',
      title: `API Endpoint: ${endpoint}`,
      visualization: {
        type: 'line',
        params: {
          query: `path:${endpoint} AND type:api`,
          metrics: [
            { name: 'count', label: 'Requests', aggregation: 'count' },
            {
              name: 'response_time',
              label: 'Response Time (p95)',
              aggregation: 'percentiles',
              percentile: 95,
            },
            {
              name: 'error_rate',
              label: 'Error Rate',
              aggregation: 'terms',
              field: 'status_code',
              filter: 'status_code:>= 400',
            },
          ],
          timeField: '@timestamp',
          interval: 'auto',
        },
      },
    }
  }

  /**
   * Create a visualization panel for error monitoring
   */
  public createErrorMonitoringPanel(errorType?: string): DashboardPanel {
    const title = errorType ? `${errorType} Errors` : 'All Errors'
    const query = errorType
      ? `level:error AND error_type:${errorType}`
      : 'level:error'

    return {
      id: `errors-${errorType || 'all'}-panel`,
      type: 'visualization',
      title,
      visualization: {
        type: 'line',
        params: {
          query,
          metrics: [
            { name: 'count', label: 'Error Count', aggregation: 'count' },
          ],
          breakdown: errorType ? undefined : { field: 'error_type', limit: 10 },
          timeField: '@timestamp',
          interval: 'auto',
        },
      },
    }
  }

  /**
   * Create a visualization panel for security events
   */
  public createSecurityPanel(eventType?: string): DashboardPanel {
    const title = eventType ? `${eventType} Events` : 'Security Events'
    const query = eventType
      ? `type:security AND event_type:${eventType}`
      : 'type:security'

    return {
      id: `security-${eventType || 'all'}-panel`,
      type: 'visualization',
      title,
      visualization: {
        type: 'line',
        params: {
          query,
          metrics: [
            { name: 'count', label: 'Event Count', aggregation: 'count' },
          ],
          breakdown: eventType ? undefined : { field: 'event_type', limit: 10 },
          timeField: '@timestamp',
          interval: 'auto',
        },
      },
    }
  }

  /**
   * Create a custom application monitoring dashboard
   */
  public async createApplicationMonitoringDashboard(
    appName: string,
    endpoints: string[] = [],
    errorTypes: string[] = [],
    options: VisualizationOptions = {},
  ): Promise<boolean> {
    // Create basic panels
    const panels: DashboardPanel[] = [
      {
        id: `${appName}-overview`,
        type: 'visualization',
        title: `${appName} Overview`,
        width: 24,
        height: 8,
        x: 0,
        y: 0,
        visualization: {
          type: 'line',
          params: {
            query: `application:${appName}`,
            metrics: [
              { name: 'count', label: 'Request Count', aggregation: 'count' },
              {
                name: 'response_time',
                label: 'Response Time (avg)',
                aggregation: 'avg',
              },
              {
                name: 'error_count',
                label: 'Error Count',
                aggregation: 'count',
                filter: 'level:error',
              },
            ],
            timeField: '@timestamp',
            interval: 'auto',
          },
        },
      },
    ]

    // Add endpoint panels
    
    for (const endpoint of endpoints) {
      panels.push({
        ...this.createApiMonitoringPanel(endpoint),
        width: 12,
        height: 8,
        x: panels.length % 2 === 0 ? 12 : 0,
        y: Math.floor((panels.length - 1) / 2) * 8 + 8,
      })
    }

    // Add error panels
    for (const errorType of errorTypes) {
      panels.push({
        ...this.createErrorMonitoringPanel(errorType),
        width: 12,
        height: 8,
        x: panels.length % 2 === 0 ? 12 : 0,
        y: Math.floor((panels.length - 1) / 2) * 8 + 8,
      })
    }

    // Create the dashboard
    return this.createCustomDashboard(
      `${appName.toLowerCase()}-dashboard`,
      `${appName} Monitoring Dashboard`,
      `Comprehensive monitoring for ${appName}`,
      panels,
      options.timeRange,
    )
  }

  /**
   * Generate shareable dashboard link
   */
  public generateShareableLink(
    dashboardId: string,
    options: VisualizationOptions = {},
  ): string {
    const timeFrom =
      options.timeRange?.from || this.config.defaultTimeRange?.from
    const timeTo = options.timeRange?.to || this.config.defaultTimeRange?.to

    const spacePrefix = this.config.spaceId ? `/s/${this.config.spaceId}` : ''
    const baseUrl = `${this.config.kibanaUrl}${spacePrefix}/app/dashboards#/view/${dashboardId}`

    const params = new URLSearchParams({
      _g: JSON.stringify({
        time: { from: timeFrom, to: timeTo },
      }),
    })

    return `${baseUrl}?${params.toString()}`
  }
}

/**
 * Create a log visualization service instance from environment variables
 */
export function createLogVisualizationFromEnv(): LogVisualization {
  return LogVisualization.getInstance({
    kibanaUrl: process.env.ELK_KIBANA_URL || 'http://localhost:5601',
    username: process.env.ELK_USERNAME,
    password: process.env.ELK_PASSWORD,
    apiKey: process.env.ELK_API_KEY,
    spaceId: process.env.ELK_KIBANA_SPACE,
    defaultTimeRange: {
      from: process.env.ELK_DEFAULT_TIME_FROM || 'now-24h',
      to: process.env.ELK_DEFAULT_TIME_TO || 'now',
    },
    refreshInterval: process.env.ELK_REFRESH_INTERVAL || '30s',
  })
}

// Create default instance
const logVisualization = createLogVisualizationFromEnv()

export default logVisualization
