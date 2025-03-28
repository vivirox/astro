import type { RedisErrorCode } from '../types'
import { logger } from '../../../../utils/logger'
import { Redis } from 'ioredis'
import { RedisServiceError } from '../types'
import { expect } from 'vitest'

/**
 * Generates a unique test key with optional prefix
 */
export function generateTestKey(prefix: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${process.env.REDIS_KEY_PREFIX}${prefix}${timestamp}:${random}`
}

/**
 * Sleeps for the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Measures the execution time of an operation
 */
export async function measureOperation(
  operation: () => Promise<unknown>,
): Promise<number> {
  const start = Date.now()
  await operation()
  return Date.now() - start
}

/**
 * Generates test data of specified size
 */
export function generateData(sizeInBytes: number): string {
  return 'x'.repeat(sizeInBytes)
}

/**
 * Cleans up test keys matching a pattern
 */
export async function cleanupTestKeys(pattern: string = '*'): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL!)

  try {
    const keys = await redis.keys(`${process.env.REDIS_KEY_PREFIX}${pattern}`)
    if (keys.length > 0) {
      await redis.del(...keys)
      logger.info(`Cleaned up ${keys.length} test keys`)
    }
  } catch (error) {
    logger.error('Error cleaning up test keys:', error)
    throw error
  } finally {
    await redis.quit()
  }
}

/**
 * Verifies Redis connection is healthy
 */
export async function verifyRedisConnection(): Promise<void> {
  const redis = new Redis(process.env.REDIS_URL!)

  try {
    await redis.ping()
    logger.info('Redis connection verified')
  } catch (error) {
    logger.error('Redis connection failed:', error)
    throw error
  } finally {
    await redis.quit()
  }
}

/**
 * Runs multiple operations concurrently and measures performance
 */
export async function runConcurrentOperations<T>(
  operations: (() => Promise<T>)[],
  options: {
    description: string
    expectedDuration?: number
    minThroughput?: number
  },
): Promise<{
  results: T[]
  duration: number
  throughput: number
}> {
  const start = Date.now()
  const results = await Promise.all(operations.map((op) => op()))
  const duration = Date.now() - start
  const throughput = Math.floor((operations.length / duration) * 1000)

  if (options.expectedDuration) {
    expect(duration).toBeLessThan(options.expectedDuration)
  }

  if (options.minThroughput) {
    expect(throughput).toBeGreaterThan(options.minThroughput)
  }

  logger.info(`${options.description}:`, {
    operations: operations.length,
    duration: `${duration}ms`,
    throughput: `${throughput} ops/sec`,
  })

  return { results, duration, throughput }
}

/**
 * Monitors memory usage during test execution
 */
export async function monitorMemoryUsage(
  operation: () => Promise<void>,
  options: {
    description: string
    maxMemoryIncrease?: number
  },
): Promise<{
  initialMemory: number
  finalMemory: number
  increase: number
}> {
  const initialMemory = process.memoryUsage().heapUsed
  await operation()
  const finalMemory = process.memoryUsage().heapUsed
  const increase = (finalMemory - initialMemory) / 1024 / 1024 // Convert to MB

  if (options.maxMemoryIncrease) {
    expect(increase).toBeLessThan(options.maxMemoryIncrease)
  }

  logger.info(`${options.description} - Memory Usage:`, {
    initial: `${(initialMemory / 1024 / 1024).toFixed(2)}MB`,
    final: `${(finalMemory / 1024 / 1024).toFixed(2)}MB`,
    increase: `${increase.toFixed(2)}MB`,
  })

  return { initialMemory, finalMemory, increase }
}

/**
 * Simulates network issues by introducing delays
 */
export async function simulateNetworkIssues(
  redis: Redis,
  options: {
    duration: number
    description: string
  },
): Promise<void> {
  logger.info(`Simulating network issues: ${options.description}`)
  await redis.disconnect()
  await sleep(options.duration)
  await redis.connect()
}

/**
 * Verifies data integrity after operations
 */
export async function verifyDataIntegrity(
  redis: Redis,
  data: { key: string; value: unknown }[],
): Promise<void> {
  const results = await Promise.all(
    data.map(async ({ key, value }) => {
      const stored = await redis.get(key)
      return {
        key,
        matches: stored === JSON.stringify(value),
      }
    }),
  )

  const failures = results.filter((r) => !r.matches)
  if (failures.length > 0) {
    logger.error('Data integrity check failed:', failures)
    throw new Error(`Data integrity check failed for ${failures.length} keys`)
  }

  logger.info(`Data integrity verified for ${data.length} keys`)
}

/**
 * Custom test matchers
 */
export const customMatchers = {
  toBeRedisError(received: unknown, expectedCode: RedisErrorCode) {
    const pass =
      received instanceof RedisServiceError && received.code === expectedCode

    return {
      message: () =>
        `expected ${received} to ${pass ? 'not ' : ''}be a RedisServiceError with code ${expectedCode}`,
      pass,
    }
  },

  async toBeInRedis(key: string, expectedValue: unknown) {
    const redis = new Redis(process.env.REDIS_URL!)

    try {
      const value = await redis.get(key)
      const pass = value === JSON.stringify(expectedValue)

      return {
        message: () =>
          `expected Redis key ${key} to ${pass ? 'not ' : ''}have value ${expectedValue}`,
        pass,
      }
    } finally {
      await redis.quit()
    }
  },

  async toExistInRedis(key: string) {
    const redis = new Redis(process.env.REDIS_URL!)

    try {
      const exists = await redis.exists(key)
      const pass = exists === 1

      return {
        message: () =>
          `expected Redis key ${key} to ${pass ? 'not ' : ''}exist`,
        pass,
      }
    } finally {
      await redis.quit()
    }
  },

  async toHaveTTL(key: string, expectedTTL: number) {
    const redis = new Redis(process.env.REDIS_URL!)

    try {
      const ttl = await redis.ttl(key)
      const pass = Math.abs(ttl - expectedTTL) <= 1 // Allow 1 second difference

      return {
        message: () =>
          `expected Redis key ${key} to ${pass ? 'not ' : ''}have TTL ${expectedTTL} (actual: ${ttl})`,
        pass,
      }
    } finally {
      await redis.quit()
    }
  },
}

// Extend expect with custom matchers
expect.extend(customMatchers)

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion {
    toBeRedisError(expectedCode: RedisErrorCode): void
    toBeInRedis(expectedValue: unknown): Promise<void>
    toExistInRedis(): Promise<void>
    toHaveTTL(expectedTTL: number): Promise<void>
  }
}
