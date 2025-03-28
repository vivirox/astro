import type { RedisServiceConfig, IRedisService } from './types'
import { EventEmitter } from 'node:events'
import { logger } from '@/lib/logger'
import Redis from 'ioredis'
import { RedisErrorCode, RedisServiceError } from './types'

/**
 * Redis service implementation with connection pooling and health checks
 */
export class RedisService extends EventEmitter implements IRedisService {
  getClient(): Redis | import('.').RedisService {
    throw new Error('Method not implemented.')
  }
  private client: Redis | null = null
  private subscribers: Map<string, Redis> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly config: RedisServiceConfig

  constructor(config: RedisServiceConfig) {
    super()
    this.validateConfig(config)
    this.config = {
      maxRetries: 3,
      retryTimeout: 1000,
      poolSize: 10,
      ...config,
    }
  }

  private validateConfig(config: RedisServiceConfig): void {
    if (!config.url) {
      throw new RedisServiceError(
        RedisErrorCode.INVALID_CONFIG,
        'Redis URL is required',
      )
    }
  }

  async connect(): Promise<void> {
    try {
      if (this.client) {
        return
      }

      this.client = new Redis(this.config.url, {
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetries,
        retryStrategy: (times: number) => {
          if (times > (this.config.maxRetries || 3)) {
            return null
          }
          return this.config.retryDelay || 100
        },
        connectTimeout: this.config.connectTimeout,
      })

      // Set up event handlers
      this.client.on('error', (error) => {
        logger.error('Redis error:', error)
      })

      this.client.on('connect', () => {
        logger.info('Connected to Redis')
      })

      this.client.on('close', () => {
        logger.warn('Redis connection closed')
      })

      await this.client.connect()

      // Start health checks
      this.startHealthCheck()
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.CONNECTION_FAILED,
        'Failed to connect to Redis',
        error,
      )
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      if (this.client) {
        await this.client.quit()
        this.client = null
      }

      await Promise.all(
        Array.from(this.subscribers.values()).map((sub) => sub.quit()),
      )
      this.subscribers.clear()
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.CONNECTION_CLOSED,
        'Error disconnecting from Redis',
        error,
      )
    }
  }

  private async ensureConnection(): Promise<Redis> {
    if (!this.client) {
      await this.connect()
    }

    if (!this.client) {
      throw new RedisServiceError(
        RedisErrorCode.CONNECTION_FAILED,
        'Redis client is not initialized',
      )
    }

    return this.client
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.isHealthy()
      } catch (error) {
        logger.error('Health check failed:', error)
      }
    }, this.config.healthCheckInterval || 5000)
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = await this.ensureConnection()
      await client.ping()
      return true
    } catch (error) {
      return false
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const client = await this.ensureConnection()
      return await client.get(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get key: ${key}`,
        error,
      )
    }
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    try {
      const client = await this.ensureConnection()
      if (ttlMs) {
        await client.set(key, value, 'PX', ttlMs)
      } else {
        await client.set(key, value)
      }
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to set key: ${key}`,
        error,
      )
    }
  }

  async del(key: string): Promise<void> {
    try {
      const client = await this.ensureConnection()
      await client.del(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to delete key: ${key}`,
        error,
      )
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.ensureConnection()
      const result = await client.exists(key)
      return result === 1
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to check existence of key: ${key}`,
        error,
      )
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.pttl(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get TTL for key: ${key}`,
        error,
      )
    }
  }

  async incr(key: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.incr(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to increment key: ${key}`,
        error,
      )
    }
  }

  async sadd(key: string, member: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.sadd(key, member)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to add member to set: ${key}`,
        error,
      )
    }
  }

  async srem(key: string, member: string): Promise<number> {
    try {
      const client = await this.ensureConnection()
      return await client.srem(key, member)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to remove member from set: ${key}`,
        error,
      )
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      const client = await this.ensureConnection()
      return await client.smembers(key)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get members of set: ${key}`,
        error,
      )
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const client = await this.ensureConnection()
      return await client.keys(pattern)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to get keys matching pattern: ${pattern}`,
        error,
      )
    }
  }

  async getPoolStats(): Promise<{
    totalConnections: number
    activeConnections: number
    idleConnections: number
    waitingClients: number
  }> {
    try {
      const client = await this.ensureConnection()
      const info = await client.info('clients')
      const stats = {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
      }

      // Parse Redis INFO output
      info.split('\n').forEach((line) => {
        if (line.startsWith('connected_clients:')) {
          stats.totalConnections = Number.parseInt(line.split(':')[1], 10)
        }
        if (line.startsWith('blocked_clients:')) {
          stats.waitingClients = Number.parseInt(line.split(':')[1], 10)
        }
      })

      stats.activeConnections = stats.totalConnections - stats.waitingClients
      stats.idleConnections = Math.max(
        0,
        stats.totalConnections - stats.activeConnections,
      )

      return stats
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        'Failed to get pool stats',
        error,
      )
    }
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    if (!this.subscribers.has(channel)) {
      const subscriber = this.createClient()
      this.subscribers.set(channel, subscriber)

      subscriber.on('message', (ch: string, message: string) => {
        if (ch === channel) {
          callback(message)
        }
      })

      await subscriber.subscribe(channel)
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.client.publish(channel, message)
    } catch (error) {
      throw new RedisServiceError(
        RedisErrorCode.OPERATION_FAILED,
        `Failed to publish to channel: ${channel}`,
        error,
      )
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    const subscriber = this.subscribers.get(channel)
    if (subscriber) {
      await subscriber.unsubscribe(channel)
      subscriber.disconnect()
      this.subscribers.delete(channel)
    }
  }
}
