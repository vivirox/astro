import { logger } from '@/lib/logger'
import { Redis } from 'ioredis'

async function globalTeardown() {
  // Clean up Redis test data
  const redis = new Redis(process.env.REDIS_URL!)

  try {
    // Clear all test keys
    const keys = await redis.keys(`${process.env.REDIS_KEY_PREFIX}*`)
    if (keys.length > 0) {
      await redis.del(...keys)
      logger.info(`Cleaned up ${keys.length} test keys`)
    }

    // Reset Redis configuration
    await redis.config('SET', 'notify-keyspace-events', '')
    logger.info('Redis configuration reset')
  } catch (error) {
    logger.error('Redis cleanup failed:', error)
    throw error
  } finally {
    await redis.quit()
  }

  // Restore console output
  if (process.env.DEBUG !== 'true') {
    console.log = global.console.log
    console.info = global.console.info
    console.debug = global.console.debug
    console.warn = global.console.warn
  }

  logger.info('Test environment cleanup complete')
}

export default globalTeardown
