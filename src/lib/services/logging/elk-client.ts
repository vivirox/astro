/**
 * ELK Stack Client
 *
 * Client for sending logs to Elasticsearch. This client is designed to work with the ELK
 * (Elasticsearch, Logstash, Kibana) stack and provides a simple interface for sending
 * structured log data to Elasticsearch.
 */

import { getLogger } from '@/lib/logging'

const logger = getLogger({ name: 'elk-client' })

export interface ELKConfig {
  enabled: boolean
  url: string
  indexPrefix: string
  username?: string
  password?: string
  apiKey?: string
  nodeName?: string
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  context?: Record<string, any>
  tags?: string[]
  [key: string]: any
}

export class ELKClient {
  private config: ELKConfig
  private isInitialized: boolean = false
  private defaultTags: string[] = []
  private batchQueue: LogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private maxBatchSize = 50
  private flushTimeoutMs = 5000

  constructor(config: ELKConfig) {
    this.config = {
      ...config,
      enabled: config.enabled ?? false,
      indexPrefix: config.indexPrefix || 'app-logs',
    }

    if (this.config.nodeName) {
      this.defaultTags.push(`node:${this.config.nodeName}`)
    }

    if (process.env.NODE_ENV) {
      this.defaultTags.push(`env:${process.env.NODE_ENV}`)
    }

    this.initialize()
  }

  /**
   * Initialize the ELK client
   */
  private initialize(): void {
    if (!this.config.enabled) {
      logger.info('ELK logging is disabled')
      return
    }

    if (!this.config.url) {
      logger.warn('ELK URL is not configured, logging to ELK is disabled')
      this.config.enabled = false
      return
    }

    // Start the flush interval
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => {
        logger.error('Failed to flush logs to ELK', err)
      })
    }, this.flushTimeoutMs)

    this.isInitialized = true
    logger.info('ELK client initialized', {
      url: this.maskSensitiveUrl(this.config.url),
      indexPrefix: this.config.indexPrefix,
      nodeName: this.config.nodeName,
    })
  }

  /**
   * Mask sensitive parts of the URL for logging
   */
  private maskSensitiveUrl(url: string): string {
    try {
      const parsedUrl = new URL(url)
      return `${parsedUrl.protocol}//${parsedUrl.host}`
    } catch (e) {
      return '[invalid url]'
    }
  }

  /**
   * Send a log entry to ELK
   */
  public async log(entry: Omit<LogEntry, 'timestamp'>): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    const fullEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
      tags: [...(entry.tags || []), ...this.defaultTags],
    }

    this.batchQueue.push(fullEntry)

    // Flush if we've reached the max batch size
    if (this.batchQueue.length >= this.maxBatchSize) {
      try {
        await this.flush()
        return true
      } catch (error) {
        logger.error('Failed to send logs to ELK', error)
        return false
      }
    }

    return true
  }

  /**
   * Flush the batch queue to ELK
   */
  public async flush(): Promise<boolean> {
    if (!this.config.enabled || this.batchQueue.length === 0) {
      return true
    }

    const batch = [...this.batchQueue]
    this.batchQueue = []

    try {
      const indexName = `${this.config.indexPrefix}-${new Date().toISOString().split('T')[0]}`
      const bulkBody = this.createBulkRequestBody(batch, indexName)

      const response = await fetch(`${this.config.url}/_bulk`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: bulkBody,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(
          `Failed to send logs to ELK: ${response.status} - ${errorText}`,
        )
      }

      return true
    } catch (error) {
      // If we fail to send logs, put them back in the queue
      this.batchQueue = [...batch, ...this.batchQueue]
      if (this.batchQueue.length > this.maxBatchSize * 2) {
        // Prevent the queue from growing too large
        this.batchQueue = this.batchQueue.slice(-this.maxBatchSize)
        logger.warn(
          `ELK log queue exceeded maximum size, dropped ${batch.length} logs`,
        )
      }

      logger.error('Failed to send logs to ELK', error)
      return false
    }
  }

  /**
   * Create the bulk request body for Elasticsearch
   */
  private createBulkRequestBody(
    entries: LogEntry[],
    indexName: string,
  ): string {
    return (
      entries
        .flatMap((entry) => [
          JSON.stringify({ index: { _index: indexName } }),
          JSON.stringify(entry),
        ])
        .join('\n') + '\n'
    )
  }

  /**
   * Get headers for Elasticsearch API requests
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
   * Shutdown the client and flush any remaining logs
   */
  public async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }

    if (this.config.enabled && this.batchQueue.length > 0) {
      try {
        await this.flush()
      } catch (error) {
        logger.error('Failed to flush logs during shutdown', error)
      }
    }
  }
}

export default ELKClient
