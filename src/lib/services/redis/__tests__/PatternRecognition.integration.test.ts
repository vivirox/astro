import { PatternRecognitionService } from '@/lib/patterns/service'
import { Redis } from 'ioredis'
import { RedisService } from '../RedisService'
import {
  cleanupTestKeys,
  monitorMemoryUsage,
  runConcurrentOperations,
  sleep,
  verifyRedisConnection,
} from './test-utils'

describe('patternRecognition Integration', () => {
  let redis: RedisService
  let patternService: PatternRecognitionService
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

    patternService = new PatternRecognitionService(redis)
    await patternService.initialize()
  })

  afterEach(async () => {
    await cleanupTestKeys()
    await patternService.shutdown()
    await redis.disconnect()
  })

  afterAll(async () => {
    await pubClient.quit()
    await subClient.quit()
  })

  describe('pattern Detection', () => {
    it('should detect simple patterns', async () => {
      const userId = 'user123'
      const interactions = [
        { type: 'anxiety', level: 'high', timestamp: Date.now() - 3000 },
        { type: 'anxiety', level: 'high', timestamp: Date.now() - 2000 },
        { type: 'anxiety', level: 'high', timestamp: Date.now() - 1000 },
      ]

      // Record interactions
      await Promise.all(
        interactions.map((interaction) =>
          patternService.recordInteraction(userId, interaction),
        ),
      )

      const patterns = await patternService.detectPatterns(userId)
      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'recurring_anxiety',
          confidence: expect.any(Number),
        }),
      )
    })

    it('should detect complex patterns', async () => {
      const userId = 'user123'
      const interactions = [
        { type: 'anxiety', level: 'low', timestamp: Date.now() - 5000 },
        { type: 'sleep', quality: 'poor', timestamp: Date.now() - 4000 },
        { type: 'anxiety', level: 'high', timestamp: Date.now() - 3000 },
        { type: 'sleep', quality: 'poor', timestamp: Date.now() - 2000 },
        { type: 'anxiety', level: 'high', timestamp: Date.now() - 1000 },
      ]

      await Promise.all(
        interactions.map((interaction) =>
          patternService.recordInteraction(userId, interaction),
        ),
      )

      const patterns = await patternService.detectPatterns(userId)
      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'sleep_anxiety_correlation',
          confidence: expect.any(Number),
        }),
      )
    })

    it('should handle temporal patterns', async () => {
      const userId = 'user123'
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000

      // Create interactions at similar times across multiple days
      const interactions = Array.from({ length: 5 }, (_, i) => ({
        type: 'anxiety',
        level: 'high',
        timestamp: now - dayInMs * i + 2 * 60 * 60 * 1000, // Same time each day
      }))

      await Promise.all(
        interactions.map((interaction) =>
          patternService.recordInteraction(userId, interaction),
        ),
      )

      const patterns = await patternService.detectPatterns(userId)
      expect(patterns).toContainEqual(
        expect.objectContaining({
          type: 'temporal_pattern',
          metadata: expect.objectContaining({
            timeOfDay: expect.any(String),
          }),
        }),
      )
    })
  })

  describe('pattern Analysis', () => {
    it('should analyze pattern strength', async () => {
      const userId = 'user123'
      const interactions = Array.from({ length: 10 }, (_, i) => ({
        type: 'anxiety',
        level: 'high',
        timestamp: Date.now() - i * 1000,
      }))

      await Promise.all(
        interactions.map((interaction) =>
          patternService.recordInteraction(userId, interaction),
        ),
      )

      const analysis = await patternService.analyzePatternStrength(
        userId,
        'anxiety',
      )
      expect(analysis).toMatchObject({
        strength: expect.any(Number),
        confidence: expect.any(Number),
        sampleSize: 10,
      })
    })

    it('should detect pattern changes', async () => {
      const userId = 'user123'

      // First pattern: high anxiety
      const highAnxiety = Array.from({ length: 5 }, (_, i) => ({
        type: 'anxiety',
        level: 'high',
        timestamp: Date.now() - i * 1000 - 10000,
      }))

      // Second pattern: decreasing anxiety
      const decreasingAnxiety = Array.from({ length: 5 }, (_, i) => ({
        type: 'anxiety',
        level: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
        timestamp: Date.now() - i * 1000,
      }))

      // Record all interactions
      await Promise.all(
        [...highAnxiety, ...decreasingAnxiety].map((interaction) =>
          patternService.recordInteraction(userId, interaction),
        ),
      )

      const changes = await patternService.detectPatternChanges(userId)
      expect(changes).toContainEqual(
        expect.objectContaining({
          type: 'anxiety_level_change',
          direction: 'decreasing',
        }),
      )
    })

    it('should calculate pattern correlations', async () => {
      const userId = 'user123'
      const interactions = [
        { type: 'sleep', quality: 'poor', timestamp: Date.now() - 4000 },
        { type: 'anxiety', level: 'high', timestamp: Date.now() - 3000 },
        { type: 'sleep', quality: 'good', timestamp: Date.now() - 2000 },
        { type: 'anxiety', level: 'low', timestamp: Date.now() - 1000 },
      ]

      await Promise.all(
        interactions.map((interaction) =>
          patternService.recordInteraction(userId, interaction),
        ),
      )

      const correlations = await patternService.analyzeCorrelations(userId)
      expect(correlations).toContainEqual(
        expect.objectContaining({
          factors: expect.arrayContaining(['sleep', 'anxiety']),
          correlation: expect.any(Number),
        }),
      )
    })
  })

  describe('pattern Storage', () => {
    it('should persist patterns across sessions', async () => {
      const userId = 'user123'
      const pattern = {
        type: 'test_pattern',
        confidence: 0.95,
        metadata: { test: true },
      }

      await patternService.storePattern(userId, pattern)

      // Create new service instance
      await patternService.shutdown()
      const newService = new PatternRecognitionService(redis)
      await newService.initialize()

      const storedPatterns = await newService.getStoredPatterns(userId)
      expect(storedPatterns).toContainEqual(expect.objectContaining(pattern))

      await newService.shutdown()
    })

    it('should handle pattern expiration', async () => {
      const userId = 'user123'
      const pattern = {
        type: 'temporary_pattern',
        confidence: 0.8,
      }

      await patternService.storePattern(userId, pattern, 2) // 2 second TTL

      // Verify pattern exists
      let patterns = await patternService.getStoredPatterns(userId)
      expect(patterns).toContainEqual(expect.objectContaining(pattern))

      // Wait for expiration
      await sleep(2100)

      // Verify pattern is expired
      patterns = await patternService.getStoredPatterns(userId)
      expect(patterns).not.toContainEqual(expect.objectContaining(pattern))
    })
  })

  describe('concurrent Operations', () => {
    it('should handle concurrent pattern detection', async () => {
      const userCount = 100
      const users = Array.from({ length: userCount }, (_, i) => `user${i}`)

      // Create test data for each user
      await Promise.all(
        users.map(async (userId) => {
          const interactions = Array.from({ length: 5 }, (_, i) => ({
            type: 'anxiety',
            level: 'high',
            timestamp: Date.now() - i * 1000,
          }))

          await Promise.all(
            interactions.map((interaction) =>
              patternService.recordInteraction(userId, interaction),
            ),
          )
        }),
      )

      // Run concurrent pattern detection
      const operations = users.map(
        (userId) => () => patternService.detectPatterns(userId),
      )

      const { duration, results } = await runConcurrentOperations(operations, {
        description: 'Concurrent pattern detection',
        expectedDuration: 5000,
      })

      expect(duration).toBeLessThan(5000)
      results.forEach((patterns) => {
        expect(patterns).toContainEqual(
          expect.objectContaining({
            type: 'recurring_anxiety',
          }),
        )
      })
    })
  })

  describe('error Handling', () => {
    it('should handle invalid interaction data', async () => {
      const userId = 'user123'
      const invalidInteraction = {
        type: 'anxiety',
        level: null,
        timestamp: 'invalid',
      }

      await expect(
        patternService.recordInteraction(userId, invalidInteraction),
      ).rejects.toThrow()
    })

    it('should handle Redis connection failures', async () => {
      const userId = 'user123'

      // Force Redis disconnection
      await redis.disconnect()

      await expect(patternService.detectPatterns(userId)).rejects.toThrow()

      // Reconnect for cleanup
      await redis.connect()
    })
  })

  describe('performance', () => {
    it('should handle large interaction histories', async () => {
      const userId = 'user123'
      const interactionCount = 10000
      const interactions = Array.from({ length: interactionCount }, (_, i) => ({
        type: 'anxiety',
        level: Math.random() > 0.5 ? 'high' : 'low',
        timestamp: Date.now() - i * 1000,
      }))

      await monitorMemoryUsage(
        async () => {
          await Promise.all(
            interactions.map((interaction) =>
              patternService.recordInteraction(userId, interaction),
            ),
          )

          const startTime = Date.now()
          const patterns = await patternService.detectPatterns(userId)
          const duration = Date.now() - startTime

          expect(duration).toBeLessThan(5000)
          expect(patterns.length).toBeGreaterThan(0)
        },
        {
          description: 'Memory usage during large history analysis',
          maxMemoryIncrease: 100, // Max 100MB increase
        },
      )
    })

    it('should maintain performance with multiple pattern types', async () => {
      const userId = 'user123'
      const patternTypes = ['anxiety', 'sleep', 'mood', 'activity', 'social']
      const interactionsPerType = 1000

      await monitorMemoryUsage(
        async () => {
          // Record interactions for each pattern type
          for (const type of patternTypes) {
            const interactions = Array.from(
              { length: interactionsPerType },
              (_, i) => ({
                type,
                level: Math.random() > 0.5 ? 'high' : 'low',
                timestamp: Date.now() - i * 1000,
              }),
            )

            await Promise.all(
              interactions.map((interaction) =>
                patternService.recordInteraction(userId, interaction),
              ),
            )
          }

          const startTime = Date.now()
          const correlations = await patternService.analyzeCorrelations(userId)
          const duration = Date.now() - startTime

          expect(duration).toBeLessThan(10000)
          expect(correlations.length).toBeGreaterThan(0)
        },
        {
          description: 'Memory usage during multi-pattern analysis',
          maxMemoryIncrease: 150, // Max 150MB increase
        },
      )
    })
  })
})
