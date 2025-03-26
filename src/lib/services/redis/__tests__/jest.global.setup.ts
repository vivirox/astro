import { logger } from '@/lib/logger'
import { Redis } from 'ioredis'

async function globalSetup() {
  // Verify Redis connection
  const redis = new Redis(process.env.REDIS_URL!)

  try {
    // Test connection
    await redis.ping()
    logger.info('Redis connection successful')

    // Clear test keys
    const keys = await redis.keys(`${process.env.REDIS_KEY_PREFIX}*`)
    if (keys.length > 0) {
      await redis.del(...keys)
      logger.info(`Cleared ${keys.length} test keys`)
    }

    // Configure test environment
    await redis.config('SET', 'notify-keyspace-events', 'KEA')
    logger.info('Redis keyspace notifications configured')
  } catch (error) {
    logger.error('Redis setup failed:', error)
    throw error
  } finally {
    await redis.quit()
  }

  // Configure test environment
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

  logger.info('Test environment configured')
}

export default globalSetup
