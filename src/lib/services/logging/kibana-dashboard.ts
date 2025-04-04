/**
 * Kibana Dashboard Generator
 *
 * Utilities for creating and configuring Kibana dashboards for our centralized logging system.
 * This provides pre-configured dashboards focused on application monitoring.
 */

import { getLogger } from '@/lib/logging'

const logger = getLogger({ name: 'kibana-dashboard' })

export interface KibanaDashboardConfig {
  kibanaUrl: string
  username?: string
  password?: string
  apiKey?: string
  spaceId?: string
}

export interface Dashboard {
  id: string
  title: string
  description: string
  timeRange?: {
    from: string
    to: string
  }
  panels: DashboardPanel[]
}

export interface DashboardPanel {
  id: string
  type: 'visualization' | 'map' | 'lens' | 'search'
  title: string
  width?: number
  height?: number
  x?: number
  y?: number
  panelIndex?: number
  visualization?: Record<string, any>
}

/**
 * Default dashboard configurations
 */
export const DEFAULT_DASHBOARDS = {
  /**
   * Application Overview Dashboard
   */
  applicationOverview: {
    id: 'application-overview',
    title: 'Application Overview',
    description: 'Overview of application performance, errors, and traffic',
    timeRange: {
      from: 'now-24h',
      to: 'now',
    },
    panels: [
      {
        id: 'request-volume',
        type: 'visualization',
        title: 'HTTP Request Volume',
        panelIndex: 1,
        x: 0,
        y: 0,
        width: 24,
        height: 8,
      },
      {
        id: 'error-rate',
        type: 'visualization',
        title: 'Error Rate',
        panelIndex: 2,
        x: 0,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'response-time',
        type: 'visualization',
        title: 'Response Time (p95)',
        panelIndex: 3,
        x: 12,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'status-codes',
        type: 'visualization',
        title: 'Status Codes',
        panelIndex: 4,
        x: 0,
        y: 16,
        width: 12,
        height: 8,
      },
      {
        id: 'top-endpoints',
        type: 'visualization',
        title: 'Top Endpoints',
        panelIndex: 5,
        x: 12,
        y: 16,
        width: 12,
        height: 8,
      },
    ],
  },

  /**
   * Error Tracking Dashboard
   */
  errorTracking: {
    id: 'error-tracking',
    title: 'Error Tracking',
    description: 'Detailed view of application errors and exceptions',
    panels: [
      {
        id: 'error-timeline',
        type: 'visualization',
        title: 'Error Timeline',
        panelIndex: 1,
        x: 0,
        y: 0,
        width: 24,
        height: 8,
      },
      {
        id: 'error-types',
        type: 'visualization',
        title: 'Error Types',
        panelIndex: 2,
        x: 0,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'error-sources',
        type: 'visualization',
        title: 'Error Sources',
        panelIndex: 3,
        x: 12,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'error-messages',
        type: 'search',
        title: 'Recent Error Messages',
        panelIndex: 4,
        x: 0,
        y: 16,
        width: 24,
        height: 12,
      },
    ],
  },

  /**
   * API Monitoring Dashboard
   */
  apiMonitoring: {
    id: 'api-monitoring',
    title: 'API Monitoring',
    description: 'Detailed view of API performance and usage',
    panels: [
      {
        id: 'api-requests',
        type: 'visualization',
        title: 'API Requests by Endpoint',
        panelIndex: 1,
        x: 0,
        y: 0,
        width: 24,
        height: 8,
      },
      {
        id: 'api-response-times',
        type: 'visualization',
        title: 'API Response Times',
        panelIndex: 2,
        x: 0,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'api-errors',
        type: 'visualization',
        title: 'API Errors by Endpoint',
        panelIndex: 3,
        x: 12,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'api-clients',
        type: 'visualization',
        title: 'Top API Clients',
        panelIndex: 4,
        x: 0,
        y: 16,
        width: 12,
        height: 8,
      },
      {
        id: 'slow-endpoints',
        type: 'visualization',
        title: 'Slowest API Endpoints',
        panelIndex: 5,
        x: 12,
        y: 16,
        width: 12,
        height: 8,
      },
    ],
  },

  /**
   * User Activity Dashboard
   */
  userActivity: {
    id: 'user-activity',
    title: 'User Activity',
    description: 'User sessions, logins, and activity patterns',
    panels: [
      {
        id: 'active-users',
        type: 'visualization',
        title: 'Active Users',
        panelIndex: 1,
        x: 0,
        y: 0,
        width: 24,
        height: 8,
      },
      {
        id: 'login-attempts',
        type: 'visualization',
        title: 'Login Attempts',
        panelIndex: 2,
        x: 0,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'login-failures',
        type: 'visualization',
        title: 'Login Failures',
        panelIndex: 3,
        x: 12,
        y: 8,
        width: 12,
        height: 8,
      },
      {
        id: 'user-locations',
        type: 'map',
        title: 'User Locations',
        panelIndex: 4,
        x: 0,
        y: 16,
        width: 24,
        height: 12,
      },
    ],
  },
}

/**
 * Kibana Dashboard Generator
 */
export class KibanaDashboardGenerator {
  private config: KibanaDashboardConfig

  constructor(config: KibanaDashboardConfig) {
    this.config = config
  }

  /**
   * Create a dashboard in Kibana
   */
  async createDashboard(dashboard: Dashboard): Promise<boolean> {
    try {
      const url = this.buildUrl(
        `/api/kibana/dashboards/dashboard/${dashboard.id}`,
      )

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          dashboard: {
            title: dashboard.title,
            description: dashboard.description,
            timeRestore: Boolean(dashboard.timeRange),
            timeFrom: dashboard.timeRange?.from,
            timeTo: dashboard.timeRange?.to,
            panels: dashboard.panels.map((panel) => ({
              panelIndex: panel.panelIndex || panel.id,
              gridData: {
                x: panel.x || 0,
                y: panel.y || 0,
                w: panel.width || 12,
                h: panel.height || 8,
                i: panel.id,
              },
              title: panel.title,
              type: panel.type,
              embeddableConfig: {
                ...panel.visualization,
              },
            })),
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to create dashboard: ${response.status} - ${errorText}`,
        )
      }

      logger.info(`Created Kibana dashboard: ${dashboard.title}`)
      return true
    } catch (error) {
      logger.error(
        `Failed to create Kibana dashboard: ${dashboard.title}`,
        error,
      )
      return false
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: string): Promise<Dashboard | null> {
    try {
      const url = this.buildUrl(
        `/api/kibana/dashboards/dashboard/${dashboardId}`,
      )

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const errorText = await response.text()
        throw new Error(
          `Failed to get dashboard: ${response.status} - ${errorText}`,
        )
      }

      const dashboardData = await response.json()
      return dashboardData
    } catch (error) {
      logger.error(`Failed to get Kibana dashboard: ${dashboardId}`, error)
      return null
    }
  }

  /**
   * Deploy standard dashboards
   */
  async deployStandardDashboards(): Promise<boolean> {
    try {
      const results = await Promise.all([
        this.createDashboard(DEFAULT_DASHBOARDS.applicationOverview),
        this.createDashboard(DEFAULT_DASHBOARDS.errorTracking),
        this.createDashboard(DEFAULT_DASHBOARDS.apiMonitoring),
        this.createDashboard(DEFAULT_DASHBOARDS.userActivity),
      ])

      const success = results.every((result) => result)
      if (success) {
        logger.info('Successfully deployed all standard Kibana dashboards')
      } else {
        logger.warn('Some Kibana dashboards could not be deployed')
      }

      return success
    } catch (error) {
      logger.error('Failed to deploy standard Kibana dashboards', error)
      return false
    }
  }

  /**
   * Build a Kibana API URL
   */
  private buildUrl(path: string): string {
    const baseUrl = this.config.kibanaUrl.endsWith('/')
      ? this.config.kibanaUrl.slice(0, -1)
      : this.config.kibanaUrl

    const spacePath = this.config.spaceId ? `/s/${this.config.spaceId}` : ''

    return `${baseUrl}${spacePath}${path}`
  }

  /**
   * Get headers for Kibana API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
    }

    // Add authentication
    if (this.config.apiKey) {
      headers.Authorization = `ApiKey ${this.config.apiKey}`
    } else if (this.config.username && this.config.password) {
      const auth = Buffer.from(
        `${this.config.username}:${this.config.password}`,
      ).toString('base64')
      headers.Authorization = `Basic ${auth}`
    }

    return headers
  }
}

export default KibanaDashboardGenerator
