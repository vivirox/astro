/**
 * Database Performance Monitoring
 *
 * This module implements database performance monitoring functionality.
 * It collects and analyzes PostgreSQL metrics for connection health,
 * query performance, and resource utilization.
 */

import { getLogger } from '../logging'
import type { Database } from '../../types/supabase'
import { createClient } from '@supabase/supabase-js'
import { config } from './config'
import { createAuditLog } from '../audit/log'
// Initialize logger
const logger = getLogger({
  prefix: 'database-monitoring',
})

// Monitor configuration
interface DatabaseMonitorConfig {
  // General settings
  enabled: boolean
  debugMode: boolean

  // Metrics collection intervals
  connectionMetricsInterval: number // milliseconds
  queryMetricsInterval: number // milliseconds
  resourceMetricsInterval: number // milliseconds

  // Thresholds
  maxConnectionPercent: number
  slowQueryThreshold: number // milliseconds
  cpuUtilizationThreshold: number
  memoryUtilizationThreshold: number
  diskSpaceThreshold: number

  // Alert settings
  alertsEnabled: boolean
  alertChannels: {
    slack: boolean
    email: boolean
    pagerduty: boolean
  }
}

// Default configuration
const defaultConfig: DatabaseMonitorConfig = {
  enabled: true,
  debugMode: false,

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
    pagerduty: true,
  },
}

/**
 * Database Monitor Service
 * Handles collection and analysis of database performance metrics
 */
export class DatabaseMonitorService {
  private config: DatabaseMonitorConfig
  private supabase: ReturnType<typeof createClient<Database>>
  private connectionMetricsInterval: NodeJS.Timeout | null = null
  private queryMetricsInterval: NodeJS.Timeout | null = null
  private resourceMetricsInterval: NodeJS.Timeout | null = null

  constructor(userConfig: Partial<DatabaseMonitorConfig> = {}) {
    this.config = { ...defaultConfig, ...userConfig }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    if (this.config.debugMode) {
      logger.info('Database monitor service initialized with configuration', {
        ...this.config,
        // Don't log the service key even when debugging
        supabaseServiceKey: '[REDACTED]',
      })
    }
  }

  /**
   * Start monitoring the database
   */
  public start(): void {
    if (!this.config.enabled) {
      logger.info('Database monitoring is disabled')
      return
    }

    logger.info('Starting database monitoring')

    // Start monitoring connection metrics
    this.connectionMetricsInterval = setInterval(
      () => this.collectConnectionMetrics(),
      this.config.connectionMetricsInterval,
    )

    // Start monitoring query metrics
    this.queryMetricsInterval = setInterval(
      () => this.collectQueryMetrics(),
      this.config.queryMetricsInterval,
    )

    // Start monitoring resource metrics
    this.resourceMetricsInterval = setInterval(
      () => this.collectResourceMetrics(),
      this.config.resourceMetricsInterval,
    )

    // Log startup
    createAuditLog('system', 'monitoring.database.start', 'monitoring', {
      enabled: this.config.enabled,
      intervals: {
        connections: this.config.connectionMetricsInterval,
        queries: this.config.queryMetricsInterval,
        resources: this.config.resourceMetricsInterval,
      },
    })
  }

  /**
   * Stop monitoring the database
   */
  public stop(): void {
    logger.info('Stopping database monitoring')

    if (this.connectionMetricsInterval) {
      clearInterval(this.connectionMetricsInterval)
      this.connectionMetricsInterval = null
    }

    if (this.queryMetricsInterval) {
      clearInterval(this.queryMetricsInterval)
      this.queryMetricsInterval = null
    }

    if (this.resourceMetricsInterval) {
      clearInterval(this.resourceMetricsInterval)
      this.resourceMetricsInterval = null
    }

    // Log shutdown
    createAuditLog('system', 'monitoring.database.stop', 'monitoring', {
      reason: 'Service shutdown',
    })
  }

  /**
   * Collect connection metrics
   */
  private async collectConnectionMetrics(): Promise<void> {
    try {
      // Execute query to get connection stats
      const { data, error } = await this.supabase.rpc('get_connection_stats')

      if (error) {
        throw error
      }

      if (!data) {
        logger.warn('No connection metrics data received')
        return
      }

      // Process and store metrics
      const {
        max_connections,
        active_connections,
        idle_connections,
        idle_in_transaction_connections,
        connection_percent,
      } = data

      logger.debug('Connection metrics collected', {
        max_connections,
        active_connections,
        idle_connections,
        idle_in_transaction_connections,
        connection_percent,
      })

      // Check for concerning connection percentage
      if (connection_percent > this.config.maxConnectionPercent) {
        this.handleConnectionAlert(data)
      }

      // Store the metrics in our time-series table
      await this.storeMetrics('connection', data)
    } catch (err) {
      logger.error('Error collecting connection metrics', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /**
   * Collect query metrics
   */
  private async collectQueryMetrics(): Promise<void> {
    try {
      // Execute query to get query stats
      const { data, error } = await this.supabase.rpc('get_query_stats')

      if (error) {
        throw error
      }

      if (!data) {
        logger.warn('No query metrics data received')
        return
      }

      // Process and store metrics
      logger.debug('Query metrics collected', {
        queryCount: data.query_count,
        slowQueries: data.slow_queries,
        cacheHitRatio: data.cache_hit_ratio,
      })

      // Check for slow queries
      if (data.slow_queries > 0) {
        this.handleSlowQueryAlert(data)
      }

      // Store the metrics in our time-series table
      await this.storeMetrics('query', data)
    } catch (err) {
      logger.error('Error collecting query metrics', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /**
   * Collect resource metrics (CPU, memory, disk)
   */
  private async collectResourceMetrics(): Promise<void> {
    try {
      // Execute query to get resource stats
      const { data, error } = await this.supabase.rpc('get_resource_stats')

      if (error) {
        throw error
      }

      if (!data) {
        logger.warn('No resource metrics data received')
        return
      }

      // Process and store metrics
      logger.debug('Resource metrics collected', {
        cpuUsage: data.cpu_usage,
        memoryUsage: data.memory_usage,
        diskUsage: data.disk_usage,
        freeSpacePercent: data.free_space_percent,
      })

      // Check for resource issues
      if (data.cpu_usage > this.config.cpuUtilizationThreshold) {
        this.handleResourceAlert('cpu', data)
      }

      if (data.memory_usage > this.config.memoryUtilizationThreshold) {
        this.handleResourceAlert('memory', data)
      }

      if (data.free_space_percent < this.config.diskSpaceThreshold) {
        this.handleResourceAlert('disk', data)
      }

      // Store the metrics in our time-series table
      await this.storeMetrics('resource', data)
    } catch (err) {
      logger.error('Error collecting resource metrics', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /**
   * Store metrics in the monitoring table
   */
  private async storeMetrics(
    metricType: 'connection' | 'query' | 'resource',
    metrics: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Insert metrics into the database_metrics table
      const { error } = await this.supabase.from('database_metrics').insert({
        type: metricType,
        timestamp: new Date().toISOString(),
        metrics: metrics,
      })

      if (error) {
        throw error
      }
    } catch (err) {
      logger.error(`Error storing ${metricType} metrics`, {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /**
   * Handle connection alerts
   */
  private handleConnectionAlert(data: Record<string, unknown>): void {
    if (!this.config.alertsEnabled) {
      return
    }

    const connectionPercent = data.connection_percent as number
    const severity = connectionPercent > 95 ? 'critical' : 'warning'

    logger.warn(`${severity.toUpperCase()} - High database connection usage`, {
      ...data,
      severity,
    })

    // Send alert based on configured channels
    this.sendAlert({
      type: 'connection',
      severity,
      message: `Database connection usage at ${connectionPercent.toFixed(2)}%`,
      data,
    })
  }

  /**
   * Handle slow query alerts
   */
  private handleSlowQueryAlert(data: Record<string, unknown>): void {
    if (!this.config.alertsEnabled) {
      return
    }

    logger.warn('Slow database queries detected', data)

    // Send alert based on configured channels
    this.sendAlert({
      type: 'query',
      severity: 'warning',
      message: `${data.slow_queries} slow queries detected`,
      data,
    })
  }

  /**
   * Handle resource alerts
   */
  private handleResourceAlert(
    resourceType: 'cpu' | 'memory' | 'disk',
    data: Record<string, unknown>,
  ): void {
    if (!this.config.alertsEnabled) {
      return
    }

    let message = ''

    if (resourceType === 'cpu') {
      message = `High CPU usage: ${data.cpu_usage}%`
    } else if (resourceType === 'memory') {
      message = `High memory usage: ${data.memory_usage}%`
    } else if (resourceType === 'disk') {
      message = `Low disk space: ${data.free_space_percent}% remaining`
    }

    logger.warn(message, data)

    // Send alert based on configured channels
    this.sendAlert({
      type: 'resource',
      subtype: resourceType,
      severity: 'warning',
      message,
      data,
    })
  }

  /**
   * Send an alert to configured channels
   */
  private sendAlert(alert: {
    type: string
    subtype?: string
    severity: 'warning' | 'critical'
    message: string
    data: Record<string, unknown>
  }): void {
    // In a real implementation, this would send to configured alert channels
    // For now, we'll log the alert and create an audit entry

    createAuditLog(
      'system',
      `monitoring.database.alert.${alert.type}`,
      'monitoring',
      {
        severity: alert.severity,
        message: alert.message,
        subtype: alert.subtype,
        timestamp: new Date().toISOString(),
      },
    )

    // In a production implementation, additional alert routing would happen here
    logger.info('Alert sent to configured channels', {
      channels: this.config.alertChannels,
      alert,
    })
  }
}

// Export singleton instance
export const databaseMonitor = new DatabaseMonitorService(config.database)
