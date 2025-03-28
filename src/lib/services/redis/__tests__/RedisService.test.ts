import { Redis } from 'ioredis'
import { RedisService } from '../RedisService'
import { RedisErrorCode } from '../types'
import {
  cleanupTestKeys,
  generateTestKey,
  monitorMemoryUsage,
  runConcurrentOperations,
  sleep,
  verifyRedisConnection,
} from './test-utils'
import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest'

const createMockRedis = () => ({
  lpush: vi.fn().mockResolvedValue(1),
  rpoplpush: vi.fn().mockResolvedValue('test-value'),
  lrem: vi.fn().mockResolvedValue(1),
  llen: vi.fn().mockResolvedValue(1),
  lrange: vi.fn().mockResolvedValue(['test-value']),
  zadd: vi.fn().mockResolvedValue(1),
  zrangebyscore: vi.fn().mockResolvedValue(['test-value']),
  zremrangebyscore: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue(['test-key']),
  hget: vi.fn().mockResolvedValue('test-value'),
  hgetall: vi.fn().mockResolvedValue({ key: 'value' }),
  hset: vi.fn().mockResolvedValue(1),
  hdel: vi.fn().mockResolvedValue(1),
  del: vi.fn().mockResolvedValue(1),
  get: vi.fn().mockResolvedValue('test-value'),
  set: vi.fn().mockResolvedValue('OK'),
  quit: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
})

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => createMockRedis()),
}))

describe('redisService', () => {
  let redis: RedisService

  beforeAll(async () => {
    await verifyRedisConnection()
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
  })

  afterEach(async () => {
    await cleanupTestKeys()
    await redis.disconnect()
  })

  describe('connection Management', () => {
    it('should connect successfully', async () => {
      expect(redis.isHealthy()).toBe(true)
    })

    it('should handle connection failures', async () => {
      const invalidRedis = new RedisService({
        url: 'redis://invalid:6379',
        keyPrefix: 'test:',
      })

      await expect(invalidRedis.connect()).rejects.toBeRedisError(
        RedisErrorCode.CONNECTION_FAILED,
      )
    })

    it('should handle disconnection', async () => {
      await redis.disconnect()
      expect(redis.isHealthy()).toBe(false)
    })

    it('should handle reconnection', async () => {
      await redis.disconnect()
      await redis.connect()
      expect(redis.isHealthy()).toBe(true)
    })

    it('should maintain connection pool', async () => {
      const stats = await redis.getPoolStats()
      expect(stats.totalConnections).toBeGreaterThanOrEqual(2)
      expect(stats.totalConnections).toBeLessThanOrEqual(10)
      expect(stats.activeConnections).toBeGreaterThanOrEqual(1)
    })
  })

  describe('key-Value Operations', () => {
    it('should set and get values', async () => {
      const key = generateTestKey('kv')
      const value = JSON.stringify({ test: 'data' })

      await redis.set(key, value)
      const result = await redis.get(key)

      expect(JSON.parse(result!)).toEqual({ test: 'data' })
    })

    it('should handle TTL', async () => {
      const key = generateTestKey('ttl')
      const value = JSON.stringify({ test: 'data' })
      const ttl = 2

      await redis.set(key, value, ttl * 1000)
      await expect(key).toHaveTTL(ttl)

      await sleep(ttl * 1000 + 100)
      const result = await redis.get(key)
      expect(result).toBeNull()
    })

    it('should delete keys', async () => {
      const key = generateTestKey('del')
      await redis.set(key, 'test')
      await redis.del(key)
      await expect(key).not.toExistInRedis()
    })

    it('should check key existence', async () => {
      const key = generateTestKey('exists')
      await redis.set(key, 'test')
      const exists = await redis.exists(key)
      expect(exists).toBe(true)
    })

    it('should increment values', async () => {
      const key = generateTestKey('incr')
      await redis.set(key, '0')
      const result = await redis.incr(key)
      expect(result).toBe(1)
    })
  })

  describe('set Operations', () => {
    it('should add and remove set members', async () => {
      const key = generateTestKey('set')
      const member = 'test-member'

      await redis.sadd(key, member)
      await expect(key).toBeInRedis([member])

      await redis.srem(key, member)
      await expect(key).toBeInRedis([])
    })

    it('should get set members', async () => {
      const key = generateTestKey('set')
      const members = ['member1', 'member2']

      for (const member of members) {
        await redis.sadd(key, member)
      }
      const result = await redis.smembers(key)
      expect(result).toEqual(expect.arrayContaining(members))
    })
  })

  describe('error Handling', () => {
    it('should handle invalid JSON', async () => {
      const key = generateTestKey('error')
      const redis = new Redis(process.env.REDIS_URL!)
      await redis.set(key, 'invalid-json')

      await expect(redis.get(key)).rejects.toBeRedisError(
        RedisErrorCode.OPERATION_FAILED,
      )
      await redis.quit()
    })

    it('should handle operation timeouts', async () => {
      const shortTimeoutRedis = new RedisService({
        url: process.env.REDIS_URL!,
        keyPrefix: process.env.REDIS_KEY_PREFIX!,
        connectTimeout: 1,
      })

      await expect(shortTimeoutRedis.connect()).rejects.toBeRedisError(
        RedisErrorCode.CONNECTION_FAILED,
      )
    })
  })

  describe('performance', () => {
    it('should handle concurrent operations', async () => {
      const key = generateTestKey('perf')
      const operations = Array.from({ length: 100 })
        .fill(null)
        .map(() => () => redis.incr(key))

      const { results } = await runConcurrentOperations(operations, {
        description: 'Concurrent increments',
        expectedDuration: 1000,
        minThroughput: 50,
      })

      expect(results[results.length - 1]).toBe(100)
    })

    it('should maintain stable memory usage', async () => {
      const key = generateTestKey('mem')
      const value = JSON.stringify({ data: 'x'.repeat(1000) })

      await monitorMemoryUsage(
        async () => {
          for (let i = 0; i < 1000; i++) {
            await redis.set(`${key}:${i}`, value)
            await redis.get(`${key}:${i}`)
            await redis.del(`${key}:${i}`)
          }
        },
        {
          description: 'Memory usage during operations',
          maxMemoryIncrease: 50, // Max 50MB increase
        },
      )
    })
  })
})
