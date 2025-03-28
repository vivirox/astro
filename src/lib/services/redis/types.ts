import type { RedisOptions } from 'ioredis'

/**
 * Configuration options for the Redis service
 */
export interface RedisServiceConfig extends RedisOptions {
  /** Redis connection URL */
  url: string
  /** Prefix for all keys */
  keyPrefix?: string
  /** Maximum number of retries for operations */
  maxRetries?: number
  /** Retry delay in milliseconds */
  retryDelay?: number
  /** Connection timeout in milliseconds */
  connectTimeout?: number
  /** Maximum number of connections in the pool */
  maxConnections?: number
  /** Minimum number of connections to keep in the pool */
  minConnections?: number
  /** Health check interval in milliseconds */
  healthCheckInterval?: number
}

/**
 * Error codes specific to the Redis service
 */
export enum RedisErrorCode {
  CONNECTION_FAILED = 'REDIS_CONNECTION_FAILED',
  OPERATION_FAILED = 'REDIS_OPERATION_FAILED',
  INVALID_CONFIG = 'REDIS_INVALID_CONFIG',
  CONNECTION_CLOSED = 'REDIS_CONNECTION_CLOSED',
  POOL_EXHAUSTED = 'REDIS_POOL_EXHAUSTED',
  HEALTH_CHECK_FAILED = 'REDIS_HEALTH_CHECK_FAILED',
}

/**
 * Custom error class for Redis service errors
 */
export class RedisServiceError extends Error {
  constructor(
    public code: RedisErrorCode,
    message: string,
    public cause?: unknown,
  ) {
    super(message)
    this.name = 'RedisServiceError'
  }
}

/**
 * Interface for the Redis service
 */
export interface IRedisService {
  /** Connect to Redis */
  connect: () => Promise<void>
  /** Disconnect from Redis */
  disconnect: () => Promise<void>
  /** Get a value by key */
  get: (key: string) => Promise<string | null>
  /** Set a value with optional expiry */
  set: (key: string, value: string, ttlMs?: number) => Promise<void>
  /** Delete a key */
  del: (key: string) => Promise<void>
  /** Check if a key exists */
  exists: (key: string) => Promise<boolean>
  /** Get the TTL of a key in milliseconds */
  ttl: (key: string) => Promise<number>
  /** Increment a key */
  incr: (key: string) => Promise<number>
  /** Add a member to a set */
  sadd: (key: string, member: string) => Promise<number>
  /** Remove a member from a set */
  srem: (key: string, member: string) => Promise<number>
  /** Get all members of a set */
  smembers: (key: string) => Promise<string[]>
  /** Check if Redis is healthy */
  isHealthy: () => Promise<boolean>
  /** Get connection pool stats */
  getPoolStats: () => Promise<{
    totalConnections: number
    activeConnections: number
    idleConnections: number
    waitingClients: number
  }>
  /** Get keys matching a pattern */
  keys: (pattern: string) => Promise<string[]>
}

// Re-export the interface as a type
export type { IRedisService as RedisService }
