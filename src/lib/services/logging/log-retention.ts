/**
 * Log Retention Policies
 *
 * Implementation of log retention policies for our centralized logging system.
 * This module handles:
 * - Configuring retention periods for different log types
 * - Managing Elasticsearch ILM (Index Lifecycle Management) policies
 * - Implementing log archiving strategies
 * - Automating the cleanup of old logs
 */

import { getLogger } from '@/lib/logging'

const logger = getLogger({ prefix: 'log-retention' })

export interface LogRetentionConfig {
  // Base retention period in days (default for all logs)
  defaultRetentionDays: number

  // Specific retention periods by log type (overrides default)
  retentionByType: {
    // System and application logs
    applicationLogs?: number
    apiLogs?: number
    errorLogs?: number
    securityLogs?: number
    auditLogs?: number

    // Infrastructure logs
    serverLogs?: number
    networkLogs?: number
    databaseLogs?: number
  }

  // Archiving configuration
  archiving: {
    enabled: boolean
    // Where to archive logs (e.g., 'cold_storage', 's3', 'azure_blob')
    destination: string
    // Archive logs older than X days
    afterDays: number
  }

  // Elasticsearch connection settings
  elasticsearch: {
    url: string
    username?: string
    password?: string
    apiKey?: string
  }
}

// Default configuration based on environment variables
const defaultConfig: LogRetentionConfig = {
  defaultRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
  retentionByType: {
    applicationLogs: parseInt(process.env.APP_LOG_RETENTION_DAYS || '90', 10),
    apiLogs: parseInt(process.env.API_LOG_RETENTION_DAYS || '90', 10),
    errorLogs: parseInt(process.env.ERROR_LOG_RETENTION_DAYS || '180', 10),
    securityLogs: parseInt(
      process.env.SECURITY_LOG_RETENTION_DAYS || '365',
      10,
    ),
    auditLogs: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '730', 10), // 2 years for compliance
    serverLogs: parseInt(process.env.SERVER_LOG_RETENTION_DAYS || '60', 10),
    networkLogs: parseInt(process.env.NETWORK_LOG_RETENTION_DAYS || '60', 10),
    databaseLogs: parseInt(process.env.DB_LOG_RETENTION_DAYS || '90', 10),
  },
  archiving: {
    enabled: process.env.LOG_ARCHIVING_ENABLED === 'true',
    destination: process.env.LOG_ARCHIVE_DESTINATION || 'cold_storage',
    afterDays: parseInt(process.env.LOG_ARCHIVE_AFTER_DAYS || '30', 10),
  },
  elasticsearch: {
    url: process.env.ELK_URL || 'http://localhost:9200',
    username: process.env.ELK_USERNAME,
    password: process.env.ELK_PASSWORD,
    apiKey: process.env.ELK_API_KEY,
  },
}

/**
 * Elasticsearch Index Lifecycle Policy template
 */
interface ILMPolicy {
  policy: {
    phases: {
      hot?: {
        actions?: Record<string, any>
      }
      warm?: {
        min_age?: string
        actions?: Record<string, any>
      }
      cold?: {
        min_age?: string
        actions?: Record<string, any>
      }
      delete?: {
        min_age?: string
        actions?: {
          delete?: Record<string, any>
        }
      }
    }
  }
}

export class LogRetention {
  private config: LogRetentionConfig
  private static instance: LogRetention

  private constructor(config: Partial<LogRetentionConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    logger.info('Log retention service initialized', {
      defaultRetention: this.config.defaultRetentionDays,
      archivingEnabled: this.config.archiving.enabled,
    })
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    config?: Partial<LogRetentionConfig>,
  ): LogRetention {
    if (!LogRetention.instance) {
      LogRetention.instance = new LogRetention(config)
    }
    return LogRetention.instance
  }

  /**
   * Setup all ILM policies in Elasticsearch
   */
  public async setupILMPolicies(): Promise<boolean> {
    try {
      // Setup standard policies
      await this.createILMPolicy(
        'app-logs-policy',
        this.config.retentionByType.applicationLogs ||
          this.config.defaultRetentionDays,
      )
      await this.createILMPolicy(
        'api-logs-policy',
        this.config.retentionByType.apiLogs || this.config.defaultRetentionDays,
      )
      await this.createILMPolicy(
        'error-logs-policy',
        this.config.retentionByType.errorLogs ||
          this.config.defaultRetentionDays,
      )
      await this.createILMPolicy(
        'security-logs-policy',
        this.config.retentionByType.securityLogs ||
          this.config.defaultRetentionDays,
      )
      await this.createILMPolicy(
        'audit-logs-policy',
        this.config.retentionByType.auditLogs ||
          this.config.defaultRetentionDays,
      )

      logger.info('ILM policies setup complete')
      return true
    } catch (error) {
      logger.error('Failed to setup ILM policies', { error })
      return false
    }
  }

  /**
   * Create or update an ILM policy
   */
  private async createILMPolicy(
    policyName: string,
    retentionDays: number,
  ): Promise<void> {
    try {
      const policy = this.generateILMPolicy(retentionDays)

      const response = await fetch(
        `${this.config.elasticsearch.url}/_ilm/policy/${policyName}`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(policy),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Elasticsearch error: ${response.status} - ${errorText}`,
        )
      }

      logger.info(`ILM policy created/updated: ${policyName}`, {
        retentionDays,
      })
    } catch (error) {
      logger.error(`Failed to create/update ILM policy: ${policyName}`, {
        error,
      })
      throw error
    }
  }

  /**
   * Generate an ILM policy with appropriate lifecycle phases
   */
  private generateILMPolicy(retentionDays: number): ILMPolicy {
    // Define the phases of the index lifecycle
    const policy: ILMPolicy = {
      policy: {
        phases: {
          hot: {
            // The 'hot' phase is the default when an index is first created
            actions: {
              rollover: {
                max_age: '1d',
                max_size: '50gb',
              },
              set_priority: {
                priority: 100,
              },
            },
          },
          warm: {
            // Move to 'warm' after 2 days
            min_age: '2d',
            actions: {
              shrink: {
                number_of_shards: 1,
              },
              forcemerge: {
                max_num_segments: 1,
              },
              allocate: {
                require: {
                  data: 'warm',
                },
              },
              set_priority: {
                priority: 50,
              },
            },
          },
        },
      },
    }

    // Add cold phase if archiving is enabled
    if (this.config.archiving.enabled) {
      policy.policy.phases.cold = {
        min_age: `${this.config.archiving.afterDays}d`,
        actions: {
          allocate: {
            require: {
              data: 'cold',
            },
          },
          set_priority: {
            priority: 0,
          },
        },
      }
    }

    // Add delete phase for retention
    policy.policy.phases.delete = {
      min_age: `${retentionDays}d`,
      actions: {
        delete: {
          delete_searchable_snapshot: true,
        },
      },
    }

    return policy
  }

  /**
   * Apply ILM policy to an index pattern
   */
  public async applyPolicyToIndexPattern(
    indexPattern: string,
    policyName: string,
  ): Promise<boolean> {
    try {
      // Create or update index template with ILM policy
      const template = {
        index_patterns: [indexPattern],
        settings: {
          'index.lifecycle.name': policyName,
          'index.lifecycle.rollover_alias': indexPattern.replace('*', ''),
        },
      }

      const response = await fetch(
        `${this.config.elasticsearch.url}/_index_template/${indexPattern.replace('*', '')}-template`,
        {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(template),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Elasticsearch error: ${response.status} - ${errorText}`,
        )
      }

      logger.info(
        `ILM policy ${policyName} applied to index pattern ${indexPattern}`,
      )
      return true
    } catch (error) {
      logger.error(
        `Failed to apply ILM policy to index pattern: ${indexPattern}`,
        { error },
      )
      return false
    }
  }

  /**
   * Get headers for Elasticsearch requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Add authentication
    if (this.config.elasticsearch.apiKey) {
      headers.Authorization = `ApiKey ${this.config.elasticsearch.apiKey}`
    } else if (
      this.config.elasticsearch.username &&
      this.config.elasticsearch.password
    ) {
      const auth = Buffer.from(
        `${this.config.elasticsearch.username}:${this.config.elasticsearch.password}`,
      ).toString('base64')
      headers.Authorization = `Basic ${auth}`
    }

    return headers
  }

  /**
   * Run manual cleanup of indices beyond retention period
   * This is a fallback for when ILM doesn't work properly
   */
  public async runManualCleanup(): Promise<void> {
    try {
      // Get list of indices
      const response = await fetch(
        `${this.config.elasticsearch.url}/_cat/indices?format=json`,
        {
          headers: this.getHeaders(),
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to get indices list: ${response.status}`)
      }

      const indices = await response.json()
      const today = new Date()
      let deletedCount = 0

      // Process each index
      for (const index of indices) {
        try {
          // Parse date from index name (assuming format: prefix-YYYY.MM.DD)
          const match = index.index.match(/.*-(\d{4})\.(\d{2})\.(\d{2})/)
          if (!match) {
            continue
          }

          const indexDate = new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3]),
          )
          const ageInDays = Math.floor(
            (today.getTime() - indexDate.getTime()) / (1000 * 60 * 60 * 24),
          )

          // Determine retention period based on index name
          let retentionDays = this.config.defaultRetentionDays
          if (index.index.includes('app-logs')) {
            retentionDays =
              this.config.retentionByType.applicationLogs ||
              this.config.defaultRetentionDays
          } else if (index.index.includes('api-logs')) {
            retentionDays =
              this.config.retentionByType.apiLogs ||
              this.config.defaultRetentionDays
          } else if (index.index.includes('error-logs')) {
            retentionDays =
              this.config.retentionByType.errorLogs ||
              this.config.defaultRetentionDays
          } else if (index.index.includes('security-logs')) {
            retentionDays =
              this.config.retentionByType.securityLogs ||
              this.config.defaultRetentionDays
          } else if (index.index.includes('audit-logs')) {
            retentionDays =
              this.config.retentionByType.auditLogs ||
              this.config.defaultRetentionDays
          }

          // Delete if older than retention period
          if (ageInDays > retentionDays) {
            const deleteResponse = await fetch(
              `${this.config.elasticsearch.url}/${index.index}`,
              {
                method: 'DELETE',
                headers: this.getHeaders(),
              },
            )

            if (deleteResponse.ok) {
              deletedCount++
              logger.info(
                `Deleted old index: ${index.index}, age: ${ageInDays} days`,
              )
            } else {
              logger.warn(`Failed to delete index: ${index.index}`, {
                status: deleteResponse.status,
              })
            }
          }
        } catch (error) {
          logger.error(`Error processing index ${index.index}`, { error })
        }
      }

      logger.info(`Manual cleanup complete. Deleted ${deletedCount} indices.`)
    } catch (error) {
      logger.error('Failed to run manual cleanup', { error })
    }
  }
}

// Create singleton instance
const logRetention = LogRetention.getInstance()

export default logRetention
