import { CacheInvalidationService } from '@/lib/cache/invalidation'
import { Redis } from 'ioredis'
import { RedisService } from '../RedisService'
import {
  cleanupTestKeys,
  generateTestKey,
  runConcurrentOperations,
  sleep,
  verifyRedisConnection,
} from './test-utils'

describe('cacheInvalidation Integration', () => {
  let redis: RedisService
  let cacheInvalidation: CacheInvalidationService
  let pubClient: Redis
  let subClient: Redis

  beforeAll(async () => {
    await verifyRedisConnection()

    // Set up Redis pub/sub clients
    pubClient = new Redis(process.env.REDIS_URL!)
    subClient = new Redis(process.env.REDIS_URL!)
  })

  beforeEach(async () => {
    redis = new RedisService({
      url: process.env.REDIS_URL!,
      keyPrefix: process.env.REDIS_KEY_PREFIX!,
      maxRetries: 3,
      retryDelay: 100,
      connectTimeout: 5000,
      maxConnections: 10,
      minConnections: 2,
    })
    await redis.connect()

    cacheInvalidation = new CacheInvalidationService(redis)
    await cacheInvalidation.initialize()
  })

  afterEach(async () => {
    await cleanupTestKeys()
    await cacheInvalidation.shutdown()
    await redis.disconnect()
  })

  afterAll(async () => {
    await pubClient.quit()
    await subClient.quit()
  })

  describe('cache Pattern Invalidation', () => {
    it('should invalidate all keys matching a pattern', async () => {
      // Set up test data
      const pattern = generateTestKey('test-pattern')
      const keys = Array.from({ length: 5 }, (_, i) => `${pattern}:${i}`)
      const value = { data: 'test' }

      // Set test keys
      await Promise.all(keys.map((key) => redis.set(key, value)))

      // Verify keys exist
      for (const key of keys) {
        await expect(key).toExistInRedis()
      }

      // Invalidate keys matching pattern
      await cacheInvalidation.invalidatePattern(`${pattern}:*`)
      await sleep(100) // Allow time for invalidation to propagate

      // Verify keys are removed
      for (const key of keys) {
        await expect(key).not.toExistInRedis()
      }
    })

    it('should handle concurrent pattern invalidations', async () => {
      // Set up test data
      const patterns = Array.from({ length: 3 }, () =>
        generateTestKey('concurrent'),
      )
      const keysPerPattern = 5
      const value = { data: 'test' }

      // Create test keys for each pattern
      for (const pattern of patterns) {
        await Promise.all(
          Array.from({ length: keysPerPattern }, (_, i) =>
            redis.set(`${pattern}:${i}`, value),
          ),
        )
      }

      // Run concurrent invalidations
      const operations = patterns.map(
        (pattern) => () => cacheInvalidation.invalidatePattern(`${pattern}:*`),
      )

      await runConcurrentOperations(operations, {
        description: 'Concurrent pattern invalidations',
        expectedDuration: 1000,
      })

      await sleep(100) // Allow time for invalidation to propagate

      // Verify all keys are removed
      for (const pattern of patterns) {
        const keys = await redis.keys(`${pattern}:*`)
        expect(keys).toHaveLength(0)
      }
    })
  })

  describe('cache Tag Invalidation', () => {
    it('should invalidate keys by tag', async () => {
      const tag = generateTestKey('tag')
      const keys = Array.from({ length: 3 }, () => generateTestKey('tagged'))
      const value = { data: 'test' }

      // Set keys with tags
      await Promise.all(
        keys.map(async (key) => {
          await redis.set(key, value)
          await cacheInvalidation.addTag(key, tag)
        }),
      )

      // Verify keys exist
      for (const key of keys) {
        await expect(key).toExistInRedis()
      }

      // Invalidate by tag
      await cacheInvalidation.invalidateTag(tag)
      await sleep(100) // Allow time for invalidation to propagate

      // Verify keys are removed
      for (const key of keys) {
        await expect(key).not.toExistInRedis()
      }
    })

    it('should handle multiple tags per key', async () => {
      const tags = Array.from({ length: 3 }, () => generateTestKey('multi-tag'))
      const key = generateTestKey('multi-tagged')
      const value = { data: 'test' }

      // Set key with multiple tags
      await redis.set(key, value)
      await Promise.all(tags.map((tag) => cacheInvalidation.addTag(key, tag)))

      // Verify key exists
      await expect(key).toExistInRedis()

      // Invalidate using each tag
      for (const tag of tags) {
        await cacheInvalidation.invalidateTag(tag)
        await sleep(100) // Allow time for invalidation to propagate
        await expect(key).not.toExistInRedis()

        // Reset key for next tag test
        if (tag !== tags[tags.length - 1]) {
          await redis.set(key, value)
          await Promise.all(tags.map((t) => cacheInvalidation.addTag(key, t)))
        }
      }
    })
  })

  describe('cache Events', () => {
    it('should emit invalidation events', async () => {
      const pattern = generateTestKey('event-test')
      const invalidationPromise = new Promise<string>((resolve) => {
        cacheInvalidation.on('invalidated', resolve)
      })

      await cacheInvalidation.invalidatePattern(`${pattern}:*`)

      const invalidatedPattern = await invalidationPromise
      expect(invalidatedPattern).toBe(`${pattern}:*`)
    })

    it('should handle invalidation event subscribers', async () => {
      const pattern = generateTestKey('subscriber-test')
      const receivedEvents: string[] = []

      // Add multiple subscribers
      const subscriber1 = (pattern: string) =>
        receivedEvents.push(`sub1:${pattern}`)
      const subscriber2 = (pattern: string) =>
        receivedEvents.push(`sub2:${pattern}`)

      cacheInvalidation.on('invalidated', subscriber1)
      cacheInvalidation.on('invalidated', subscriber2)

      await cacheInvalidation.invalidatePattern(`${pattern}:*`)
      await sleep(100) // Allow time for events to propagate

      expect(receivedEvents).toHaveLength(2)
      expect(receivedEvents).toContain(`sub1:${pattern}:*`)
      expect(receivedEvents).toContain(`sub2:${pattern}:*`)

      // Clean up subscribers
      cacheInvalidation.off('invalidated', subscriber1)
      cacheInvalidation.off('invalidated', subscriber2)
    })
  })

  describe('error Handling', () => {
    it('should handle Redis connection failures during invalidation', async () => {
      const pattern = generateTestKey('error-test')

      // Force Redis disconnection
      await redis.disconnect()

      // Attempt invalidation
      await expect(
        cacheInvalidation.invalidatePattern(`${pattern}:*`),
      ).rejects.toThrow()

      // Reconnect for cleanup
      await redis.connect()
    })

    it('should handle Redis connection recovery', async () => {
      const pattern = generateTestKey('recovery-test')
      const key = `${pattern}:1`
      const value = { data: 'test' }

      // Set test key
      await redis.set(key, value)

      // Force Redis disconnection and reconnection
      await redis.disconnect()
      await redis.connect()

      // Attempt invalidation after recovery
      await cacheInvalidation.invalidatePattern(`${pattern}:*`)
      await sleep(100) // Allow time for invalidation to propagate

      await expect(key).not.toExistInRedis()
    })
  })

  describe('performance', () => {
    it('should handle large-scale invalidations', async () => {
      const pattern = generateTestKey('perf-test')
      const keyCount = 1000
      const value = { data: 'test' }

      // Create many test keys
      await Promise.all(
        Array.from({ length: keyCount }, (_, i) =>
          redis.set(`${pattern}:${i}`, value),
        ),
      )

      const startTime = Date.now()
      await cacheInvalidation.invalidatePattern(`${pattern}:*`)
      const duration = Date.now() - startTime

      // Verify performance
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds

      await sleep(100) // Allow time for invalidation to propagate

      // Verify all keys are removed
      const remainingKeys = await redis.keys(`${pattern}:*`)
      expect(remainingKeys).toHaveLength(0)
    })

    it('should maintain performance under concurrent load', async () => {
      const basePattern = generateTestKey('concurrent-perf')
      const patterns = Array.from(
        { length: 10 },
        (_, i) => `${basePattern}:${i}`,
      )
      const keysPerPattern = 100
      const value = { data: 'test' }

      // Create test keys for each pattern
      for (const pattern of patterns) {
        await Promise.all(
          Array.from({ length: keysPerPattern }, (_, i) =>
            redis.set(`${pattern}:${i}`, value),
          ),
        )
      }

      // Run concurrent invalidations
      const operations = patterns.map(
        (pattern) => () => cacheInvalidation.invalidatePattern(`${pattern}:*`),
      )

      const { duration } = await runConcurrentOperations(operations, {
        description: 'Large-scale concurrent invalidations',
        expectedDuration: 10000, // Should complete within 10 seconds
      })

      // Verify performance
      expect(duration).toBeLessThan(10000)

      await sleep(100) // Allow time for invalidation to propagate

      // Verify all keys are removed
      const remainingKeys = await redis.keys(`${basePattern}:*`)
      expect(remainingKeys).toHaveLength(0)
    })
  })
})
