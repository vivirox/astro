import type { RedisErrorCode } from '../types'
import { logger } from '@/lib/logger'
import { Redis } from 'ioredis'
import { customMatchers } from './test-utils'

// Configure test environment
jest.setTimeout(30000) // 30 seconds default timeout

// Set environment variables
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
process.env.REDIS_KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'test:'
process.env.NODE_ENV = 'test'
process.env.DEBUG = process.env.DEBUG || 'false'
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error'

// Configure console output
if (process.env.DEBUG !== 'true') {
  const noop = () => {}
  console.log = noop
  console.info = noop
  console.debug = noop
  console.warn = noop
}

// Add custom matchers
expect.extend(customMatchers)

// Verify Redis connection before tests
beforeAll(async () => {
  const redis = new Redis(process.env.REDIS_URL!)

  try {
    await redis.ping()
    logger.info('Redis connection verified')

    // Configure Redis for tests
    await redis.config('SET', 'notify-keyspace-events', 'KEA')
    await redis.client('SETNAME', 'redis-service-test')
    await redis.config('SET', 'maxmemory', '100mb')
    await redis.config('SET', 'maxmemory-policy', 'allkeys-lru')

    logger.info('Redis test configuration applied')
  } catch (error) {
    logger.error('Redis setup failed:', error)
    throw error
  } finally {
    await redis.quit()
  }
})

// Clean up test keys after each test
afterEach(async () => {
  const redis = new Redis(process.env.REDIS_URL!)

  try {
    const keys = await redis.keys(`${process.env.REDIS_KEY_PREFIX}*`)
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
})

// Reset Redis configuration after all tests
afterAll(async () => {
  const redis = new Redis(process.env.REDIS_URL!)

  try {
    // Reset Redis configuration
    await redis.config('SET', 'notify-keyspace-events', '')
    await redis.config('SET', 'maxmemory', '0')
    await redis.config('SET', 'maxmemory-policy', 'noeviction')

    // Clean up all test keys
    const keys = await redis.keys(`${process.env.REDIS_KEY_PREFIX}*`)
    if (keys.length > 0) {
      await redis.del(...keys)
      logger.info(`Cleaned up ${keys.length} remaining test keys`)
    }

    logger.info('Redis configuration reset')
  } catch (error) {
    logger.error('Redis cleanup failed:', error)
    throw error
  } finally {
    await redis.quit()
  }
})

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeRedisError(expectedCode: RedisErrorCode): R
      toBeInRedis(expectedValue: unknown): Promise<R>
      toExistInRedis(): Promise<R>
      toHaveTTL(expectedTTL: number): Promise<R>
    }
  }
}
