import { AnalyticsService } from '@/lib/analytics/service'
import { Redis } from 'ioredis'
import { RedisService } from '../RedisService'
import {
  cleanupTestKeys,
  generateTestKey,
  monitorMemoryUsage,
  runConcurrentOperations,
  sleep,
  verifyRedisConnection,
} from './test-utils'

describe('analytics Integration', () => {
  let redis: RedisService
  let analytics: AnalyticsService
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

    analytics = new AnalyticsService(redis)
    await analytics.initialize()
  })

  afterEach(async () => {
    await cleanupTestKeys()
    await analytics.shutdown()
    await redis.disconnect()
  })

  afterAll(async () => {
    await pubClient.quit()
    await subClient.quit()
  })

  describe('event Tracking', () => {
    it('should track individual events', async () => {
      const userId = 'user123'
      const event = {
        type: 'session_start',
        timestamp: Date.now(),
        metadata: { browser: 'Chrome', os: 'MacOS' },
      }

      await analytics.trackEvent(userId, event)
      const events = await analytics.getUserEvents(userId)

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject(event)
    })

    it('should handle concurrent event tracking', async () => {
      const userId = 'user123'
      const eventCount = 100
      const events = Array.from({ length: eventCount }, (_, i) => ({
        type: 'test_event',
        timestamp: Date.now() + i,
        metadata: { index: i },
      }))

      const operations = events.map(
        (event) => () => analytics.trackEvent(userId, event),
      )

      await runConcurrentOperations(operations, {
        description: 'Concurrent event tracking',
        expectedDuration: 2000,
        minThroughput: 50,
      })

      const storedEvents = await analytics.getUserEvents(userId)
      expect(storedEvents).toHaveLength(eventCount)
    })

    it('should maintain event order', async () => {
      const userId = 'user123'
      const events = Array.from({ length: 5 }, (_, i) => ({
        type: 'ordered_event',
        timestamp: Date.now() + i * 1000,
        metadata: { sequence: i },
      }))

      // Track events in reverse order
      for (const event of events.reverse()) {
        await analytics.trackEvent(userId, event)
      }

      const storedEvents = await analytics.getUserEvents(userId)
      expect(storedEvents).toHaveLength(events.length)

      // Verify events are stored in chronological order
      storedEvents.forEach((event, i) => {
        expect(event.metadata.sequence).toBe(i)
      })
    })
  })

  describe('metrics Aggregation', () => {
    it('should aggregate metrics over time', async () => {
      const metric = generateTestKey('response_time')
      const values = Array.from({ length: 100 }, () => Math.random() * 100)

      // Record metric values
      await Promise.all(
        values.map((value) => analytics.recordMetric(metric, value)),
      )

      const stats = await analytics.getMetricStats(metric)
      expect(stats).toMatchObject({
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b) / values.length,
      })
    })

    it('should maintain metric history', async () => {
      const metric = generateTestKey('cpu_usage')
      const intervals = 5
      const valuesPerInterval = 10

      // Record metrics for different time intervals
      for (let i = 0; i < intervals; i++) {
        const timestamp = Date.now() - (intervals - i) * 60000 // 1 minute intervals
        for (let j = 0; j < valuesPerInterval; j++) {
          await analytics.recordMetric(metric, Math.random() * 100, timestamp)
        }
      }

      const history = await analytics.getMetricHistory(metric, intervals)
      expect(history).toHaveLength(intervals)
      history.forEach((interval) => {
        expect(interval.count).toBe(valuesPerInterval)
      })
    })

    it('should handle metric expiration', async () => {
      const metric = generateTestKey('temp_metric')
      const ttl = 2 // 2 seconds

      await analytics.recordMetric(metric, 100, Date.now(), ttl)

      // Verify metric exists
      let stats = await analytics.getMetricStats(metric)
      expect(stats.count).toBe(1)

      // Wait for expiration
      await sleep(ttl * 1000 + 100)

      // Verify metric is expired
      stats = await analytics.getMetricStats(metric)
      expect(stats.count).toBe(0)
    })
  })

  describe('real-time Analytics', () => {
    it('should track active users', async () => {
      const users = Array.from({ length: 5 }, (_, i) => `user${i}`)

      // Mark users as active
      await Promise.all(users.map((userId) => analytics.markUserActive(userId)))

      const activeUsers = await analytics.getActiveUsers()
      expect(activeUsers).toHaveLength(users.length)
      users.forEach((userId) => {
        expect(activeUsers).toContain(userId)
      })
    })

    it('should handle user session timeouts', async () => {
      const userId = 'user123'
      const sessionTtl = 2 // 2 seconds

      await analytics.markUserActive(userId, sessionTtl)

      // Verify user is active
      let activeUsers = await analytics.getActiveUsers()
      expect(activeUsers).toContain(userId)

      // Wait for session timeout
      await sleep(sessionTtl * 1000 + 100)

      // Verify user is no longer active
      activeUsers = await analytics.getActiveUsers()
      expect(activeUsers).not.toContain(userId)
    })

    it('should track concurrent sessions', async () => {
      const baseUserId = 'user'
      const sessionCount = 1000
      const users = Array.from(
        { length: sessionCount },
        (_, i) => `${baseUserId}${i}`,
      )

      await monitorMemoryUsage(
        async () => {
          const operations = users.map(
            (userId) => () => analytics.markUserActive(userId),
          )

          await runConcurrentOperations(operations, {
            description: 'Concurrent session tracking',
            expectedDuration: 5000,
            minThroughput: 200,
          })
        },
        {
          description: 'Memory usage during session tracking',
          maxMemoryIncrease: 50, // Max 50MB increase
        },
      )

      const activeUsers = await analytics.getActiveUsers()
      expect(activeUsers).toHaveLength(sessionCount)
    })
  })

  describe('error Handling', () => {
    it('should handle Redis connection failures', async () => {
      const userId = 'user123'
      const event = {
        type: 'error_test',
        timestamp: Date.now(),
      }

      // Force Redis disconnection
      await redis.disconnect()

      // Attempt to track event
      await expect(analytics.trackEvent(userId, event)).rejects.toThrow()

      // Reconnect for cleanup
      await redis.connect()
    })

    it('should handle invalid metric values', async () => {
      const metric = generateTestKey('invalid_metric')

      await expect(analytics.recordMetric(metric, Number.NaN)).rejects.toThrow()

      await expect(analytics.recordMetric(metric, Infinity)).rejects.toThrow()
    })

    it('should handle Redis memory limits', async () => {
      const metric = generateTestKey('memory_test')
      const largeValue = 'x'.repeat(1024 * 1024) // 1MB string

      // Attempt to store large values
      const promises = Array.from({ length: 100 }, () =>
        analytics.recordMetric(metric, largeValue),
      )

      await expect(Promise.all(promises)).rejects.toThrow()
    })
  })

  describe('performance', () => {
    it('should handle high event throughput', async () => {
      const userId = 'user123'
      const eventCount = 10000
      const events = Array.from({ length: eventCount }, (_, i) => ({
        type: 'perf_test',
        timestamp: Date.now() + i,
        metadata: { index: i },
      }))

      const { duration, throughput } = await runConcurrentOperations(
        events.map((event) => () => analytics.trackEvent(userId, event)),
        {
          description: 'High throughput event tracking',
          expectedDuration: 10000,
          minThroughput: 1000,
        },
      )

      expect(duration).toBeLessThan(10000)
      expect(throughput).toBeGreaterThan(1000)

      const storedEvents = await analytics.getUserEvents(userId)
      expect(storedEvents).toHaveLength(eventCount)
    })

    it('should maintain performance with large datasets', async () => {
      const userCount = 100
      const eventsPerUser = 100
      const users = Array.from({ length: userCount }, (_, i) => `user${i}`)

      await monitorMemoryUsage(
        async () => {
          for (const userId of users) {
            const events = Array.from({ length: eventsPerUser }, (_, i) => ({
              type: 'bulk_test',
              timestamp: Date.now() + i,
              metadata: { user: userId, index: i },
            }))

            await Promise.all(
              events.map((event) => analytics.trackEvent(userId, event)),
            )
          }
        },
        {
          description: 'Memory usage during bulk event tracking',
          maxMemoryIncrease: 100, // Max 100MB increase
        },
      )

      // Verify data integrity
      for (const userId of users) {
        const events = await analytics.getUserEvents(userId)
        expect(events).toHaveLength(eventsPerUser)
      }
    })
  })
})
