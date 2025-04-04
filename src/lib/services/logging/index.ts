/**
 * Logging Services Index
 *
 * This file exports all components of the centralized logging service.
 * These services provide integration with the ELK stack (Elasticsearch, Logstash, Kibana)
 * for advanced log management, visualization, and analytics.
 */

import elkService, { ELKService, type ELKConfig } from './elk'
import { getLogger } from '@/lib/logging'
import logRetention, {
  LogRetention,
  type LogRetentionConfig,
} from './log-retention'
import logVisualization, {
  LogVisualization,
  type LogVisualizationConfig,
  type VisualizationOptions,
} from './log-visualization'

const logger = getLogger({ prefix: 'logging-service' })

export interface LoggingServiceConfig {
  elk?: ELKConfig
  retention?: Partial<LogRetentionConfig>
  visualization?: LogVisualizationConfig
}

/**
 * Initialize all logging services
 */
export function initializeLoggingServices(
  config: LoggingServiceConfig = {},
): void {
  try {
    // Initialize ELK if configured
    if (config.elk) {
      
      logger.info('ELK logging service initialized')
    }

    // Initialize log retention if configured
    if (config.retention) {
      const retentionInstance = LogRetention.getInstance(config.retention)
      retentionInstance.setupILMPolicies().catch((err) => {
        logger.error('Failed to setup ILM policies', { error: err })
      })
      logger.info('Log retention service initialized')
    }

    // Initialize log visualization if configured
    if (config.visualization) {
      const visualizationInstance = LogVisualization.getInstance(
        config.visualization,
      )
      visualizationInstance.deployStandardDashboards().catch((err) => {
        logger.error('Failed to deploy standard dashboards', { error: err })
      })
      logger.info('Log visualization service initialized')
    }

    // Add any additional logging service initialization here

    logger.info('All logging services initialized')
  } catch (error) {
    logger.error('Failed to initialize logging services', error)
  }
}

/**
 * Add a hook to intercept logs from the main logger system
 * This will capture logs and forward them to centralized services
 */
export function setupLogInterception(): void {
  // This would integrate with the main logging system to capture logs
  // Implementation depends on the logging system architecture
  logger.info(
    'Log interception setup - ready to send logs to centralized services',
  )
}

// Schedule log retention cleanup to run daily
export function scheduleLogRetentionTasks(): NodeJS.Timeout {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

  const cleanupInterval = setInterval(() => {
    logger.info('Running scheduled log retention cleanup')
    logRetention.runManualCleanup().catch((err) => {
      logger.error('Failed to run log retention cleanup', { error: err })
    })
  }, TWENTY_FOUR_HOURS)

  // Run immediately on startup
  logRetention.runManualCleanup().catch((err) => {
    logger.error('Failed to run initial log retention cleanup', { error: err })
  })

  return cleanupInterval
}

export {
  elkService,
  ELKService,
  type ELKConfig,
  logRetention,
  LogRetention,
  type LogRetentionConfig,
  logVisualization,
  LogVisualization,
  type LogVisualizationConfig,
  type VisualizationOptions,
}

export default {
  initialize: initializeLoggingServices,
  setupInterception: setupLogInterception,
  scheduleRetention: scheduleLogRetentionTasks,
  elk: elkService,
  retention: logRetention,
  visualization: logVisualization,
}

export { default as ELKClient } from './elk-client'
export * from './elk-client'

export { default as KibanaDashboardGenerator } from './kibana-dashboard'
export * from './kibana-dashboard'

export { default as LoggingService } from './logging-service'
export * from './logging-service'

/**
 * Configuration interface for all logging services
 */
export interface LoggingConfig {
  /** Whether to enable ELK stack integration */
  elkEnabled: boolean
  /** Elasticsearch URL */
  elkUrl: string
  /** Index prefix for Elasticsearch indices */
  elkIndexPrefix: string
  /** Optional username for Elasticsearch authentication */
  elkUsername?: string
  /** Optional password for Elasticsearch authentication */
  elkPassword?: string
  /** Optional API key for Elasticsearch authentication */
  elkApiKey?: string
  /** Optional node name for identifying the source of logs */
  nodeName?: string
  /** Kibana URL for dashboard integration */
  kibanaUrl?: string
  /** Whether to enable log retention policies */
  retentionEnabled: boolean
  /** Default retention period in days */
  defaultRetentionDays: number
  /** Whether to archive logs */
  archivingEnabled: boolean
  /** Where to archive logs */
  archiveDestination?: string
  /** Archive logs after X days */
  archiveAfterDays?: number
}

/**
 * Load logging configuration from environment variables
 */
export function loadLoggingConfig(): LoggingConfig {
  return {
    elkEnabled: process.env.ELK_ENABLED === 'true',
    elkUrl: process.env.ELK_URL || '',
    elkIndexPrefix: process.env.ELK_INDEX_PREFIX || 'app-logs',
    elkUsername: process.env.ELK_USERNAME,
    elkPassword: process.env.ELK_PASSWORD,
    elkApiKey: process.env.ELK_API_KEY,
    nodeName: process.env.ELK_NODE_NAME,
    kibanaUrl: process.env.ELK_KIBANA_URL,
    retentionEnabled: process.env.LOG_RETENTION_ENABLED === 'true',
    defaultRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
    archivingEnabled: process.env.LOG_ARCHIVING_ENABLED === 'true',
    archiveDestination: process.env.LOG_ARCHIVE_DESTINATION,
    archiveAfterDays: process.env.LOG_ARCHIVE_AFTER_DAYS
      ? parseInt(process.env.LOG_ARCHIVE_AFTER_DAYS, 10)
      : 30,
  }
}
