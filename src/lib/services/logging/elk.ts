/**
 * ELK Integration Service
 *
 * A service for sending logs to ELK (Elasticsearch, Logstash, Kibana) stack.
 * This provides centralized logging capabilities for the application.
 */

import type { LogMessage, } from '@/lib/logging/index'
import { getLogger } from '@/lib/logging'

const logger = getLogger({ prefix: 'elk-service' })

// Environment variables for ELK configuration
const ELK_ENABLED = process.env.ELK_ENABLED === 'true'
const ELK_URL = process.env.ELK_URL || 'http://localhost:9200'
const ELK_INDEX_PREFIX = process.env.ELK_INDEX_PREFIX || 'astro-app'
const { ELK_API_KEY, ELK_USERNAME, ELK_PASSWORD } = process.env
const ELK_NODE_NAME = process.env.ELK_NODE_NAME || 'astro-node'

export interface ELKConfig {
  enabled?: boolean
  url?: string
  indexPrefix?: string
  apiKey?: string
  username?: string
  password?: string
  nodeName?: string
  batchSize?: number
  flushInterval?: number
}

/**
 * ELK Service for centralized logging
 */
export class ELKService {
  private static instance: ELKService
  private config: Required<ELKConfig>
  private logBuffer: Record<string, any>[] = []
  private flushInterval?: NodeJS.Timeout
  private isInitialized = false

  /**
   * Default configuration
   */
  private static DEFAULT_CONFIG: Required<ELKConfig> = {
    enabled: ELK_ENABLED,
    url: ELK_URL,
    indexPrefix: ELK_INDEX_PREFIX,
    apiKey: ELK_API_KEY || '',
    username: ELK_USERNAME || '',
    password: ELK_PASSWORD || '',
    nodeName: ELK_NODE_NAME,
    batchSize: 50,
    flushInterval: 10000, // 10 seconds
  }

  private constructor(config: ELKConfig = {}) {
    this.config = { ...ELKService.DEFAULT_CONFIG, ...config }

    if (this.config.enabled) {
      this.initialize()
    } else {
      logger.info('ELK logging is disabled')
    }
  }

  /**
   * Get the ELK service instance (singleton)
   */
  public static getInstance(config?: ELKConfig): ELKService {
    if (!ELKService.instance) {
      ELKService.instance = new ELKService(config)
    }
    return ELKService.instance
  }

  /**
   * Initialize the ELK service
   */
  private initialize(): void {
    if (this.isInitialized) {
      return
    }

    try {
      // Setup periodic flush of logs
      this.flushInterval = setInterval(() => {
        this.flushLogs().catch((err) => {
          logger.error('Failed to flush logs to ELK', { error: err })
        })
      }, this.config.flushInterval)

      // Setup clean shutdown
      process.on('beforeExit', () => {
        this.shutdown().catch((err) => {
          logger.error('Error during ELK shutdown', { error: err })
        })
      })

      this.isInitialized = true
      logger.info('ELK service initialized', {
        url: this.config.url,
        indexPrefix: this.config.indexPrefix,
        nodeName: this.config.nodeName,
      })
    } catch (error) {
      logger.error('Failed to initialize ELK service', { error })
    }
  }

  /**
   * Send a log to ELK
   */
  public async log(logMessage: LogMessage): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    try {
      const elkDocument = this.formatLogForELK(logMessage)
      this.logBuffer.push(elkDocument)

      // Flush if buffer reaches threshold
      if (this.logBuffer.length >= this.config.batchSize) {
        await this.flushLogs()
      }
    } catch (error) {
      logger.error('Failed to send log to ELK', { error })
    }
  }

  /**
   * Format a log message for ELK
   */
  private formatLogForELK(logMessage: LogMessage): Record<string, any> {
    const { level, message, timestamp, prefix, metadata } = logMessage

    return {
      '@timestamp': timestamp.toISOString(),
      message,
      level,
      prefix,
      'node_name': this.config.nodeName,
      'environment': process.env.NODE_ENV || 'development',
      'application': 'astro-app',
      metadata,
    }
  }

  /**
   * Flush logs to ELK
   */
  private async flushLogs(): Promise<void> {
    if (!this.config.enabled || this.logBuffer.length === 0) {
      return
    }

    const logs = [...this.logBuffer]
    this.logBuffer = []

    try {
      // Build the bulk request body
      const body = logs.flatMap((doc) => [
        { index: { _index: this.getIndexName() } },
        doc,
      ])

      // Send to Elasticsearch
      const response = await fetch(`${this.config.url}/_bulk`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: body.map((item) => JSON.stringify(item)).join('\n') + '\n',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Elasticsearch error: ${response.status} - ${errorText}`,
        )
      }

      logger.debug(`Sent ${logs.length} logs to ELK`)
    } catch (error) {
      logger.error('Failed to flush logs to ELK', { error })
      // Put the logs back in the buffer for retry on next flush
      this.logBuffer = [...logs, ...this.logBuffer].slice(
        0,
        this.config.batchSize * 2,
      )
    }
  }

  /**
   * Get Elasticsearch index name with date-based pattern
   */
  private getIndexName(): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${this.config.indexPrefix}-${year}.${month}.${day}`
  }

  /**
   * Get headers for Elasticsearch requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/x-ndjson',
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

  /**
   * Shutdown the ELK service, flushing any remaining logs
   */
  public async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    if (this.logBuffer.length > 0) {
      await this.flushLogs()
    }

    this.isInitialized = false
    logger.info('ELK service shut down')
  }
}

// Create an instance of the ELK service
const elkService = ELKService.getInstance()

export default elkService
