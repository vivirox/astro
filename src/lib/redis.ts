/**
 * Redis client wrapper for Upstash Redis
 * This module provides a consistent interface for Redis operations with proper error handling
 */

import { Redis } from '@upstash/redis'
import { env } from '../config/env.config'

// Determine if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production'

// Check if we have required environment variables
const restUrl =
  process.env.UPSTASH_REDIS_REST_URL || env?.UPSTASH_REDIS_REST_URL
const restToken =
  process.env.UPSTASH_REDIS_REST_TOKEN || env?.UPSTASH_REDIS_REST_TOKEN

// Log appropriate warnings in production
if (isProduction && (!restUrl || !restToken)) {
  console.error('CRITICAL: Missing Redis credentials in production environment')
}

// Create a mock Redis client for development
function createMockRedisClient() {
  const message = isProduction
    ? 'CRITICAL: Using mock Redis client in production. This should never happen.'
    : 'Using mock Redis client for development. This should not be used in production.'

  console.warn(message)

  return {
    get: async (key: string) => null,
    set: async (key: string, value: any, options?: any) => 'OK',
    del: async (key: string) => 1,
    incr: async (key: string) => 1,
    exists: async (key: string) => 0,
    expire: async (key: string, seconds: number) => 1,
    hset: async (key: string, field: string, value: any) => 1,
    hget: async (key: string, field: string) => null,
    hgetall: async (key: string) => ({}),
    hdel: async (key: string, field: string) => 1,
    disconnect: async () => {},
  }
}

// Check if we have valid credentials
const hasValidCredentials = Boolean(restUrl && restToken)

// Create Redis client with appropriate configuration
export const redis = hasValidCredentials
  ? new Redis({
      url: restUrl as string,
      token: restToken as string,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(retryCount * 500, 3000),
      },
    })
  : (createMockRedisClient() as any)

/**
 * Wrapper function for Redis get with error handling
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    return (await redis.get(key)) as T | null
  } catch (error) {
    console.error(`Error getting key ${key} from Redis:`, error)
    return null
  }
}

/**
 * Wrapper function for Redis set with error handling
 */
export async function setInCache(
  key: string,
  value: any,
  expirationSeconds?: number,
): Promise<boolean> {
  try {
    const options = expirationSeconds ? { ex: expirationSeconds } : undefined
    await redis.set(key, value, options)
    return true
  } catch (error) {
    console.error(`Error setting key ${key} in Redis:`, error)
    return false
  }
}

/**
 * Wrapper function for Redis del with error handling
 */
export async function removeFromCache(key: string): Promise<boolean> {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error(`Error removing key ${key} from Redis:`, error)
    return false
  }
}

/**
 * Check Redis connectivity
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pingResult = await redis.ping()
    return pingResult === 'PONG'
  } catch (error) {
    console.error('Redis connectivity check failed:', error)
    return false
  }
}

/**
 * Health check for Redis service
 */
export async function getRedisHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  details?: any
}> {
  try {
    const isConnected = await checkRedisConnection()
    if (isConnected) {
      return { status: 'healthy' }
    } else {
      return {
        status: 'unhealthy',
        details: { message: 'Could not connect to Redis' },
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        message: 'Redis health check failed',
        error: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
