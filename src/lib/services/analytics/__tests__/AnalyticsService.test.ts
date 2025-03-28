import { getLogger } from '@/lib/utils/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { AnalyticsService, EventPriority, EventType } from '../AnalyticsService'

// Create a mock Redis client
const mockRedisClient = {
  lpush: vi.fn(),
  rpoplpush: vi.fn(),
  lrem: vi.fn(),
  llen: vi.fn(),
  lrange: vi.fn(),
  zadd: vi.fn(),
  zrangebyscore: vi.fn(),
  zremrangebyscore: vi.fn(),
  keys: vi.fn(),
  hget: vi.fn(),
  hgetall: vi.fn(),
  hset: vi.fn(),
  hdel: vi.fn(),
  del: vi.fn(),
}

// Mock dependencies
vi.mock('@/lib/services/redis', () => ({
  RedisService: vi.fn().mockImplementation(() => ({
    getClient: () => mockRedisClient,
  })),
}))

vi.mock('crypto', () => ({
  randomUUID: () => 'test-uuid',
}))

// Create a mock logger instance
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}

// Mock the logger module
vi.mock('@/lib/utils/logger', () => ({
  getLogger: vi.fn(() => mockLogger),
  logger: mockLogger,
}))

// Create a mock WebSocket class
class MockWebSocket {
  public readonly url: string
  public readyState: number = 1 // WebSocket.OPEN

  constructor(url: string) {
    this.url = url
  }

  public send = vi.fn()
  public emit = vi.fn()
  public on = vi.fn()
}

vi.mock('ws', () => ({
  WebSocket: vi
    .fn()
    .mockImplementation((url: string) => new MockWebSocket(url)),
}))

describe('analyticsService', () => {
  let analyticsService: AnalyticsService

  const mockEvent = {
    type: EventType.USER_ACTION,
    priority: EventPriority.NORMAL,
    userId: 'test-user',
    sessionId: 'test-session',
    timestamp: Date.now(),
    properties: {
      action: 'click',
      target: 'button',
    },
    metadata: {
      browser: 'Chrome',
      os: 'macOS',
    },
  }

  const mockMetric = {
    name: 'response_time',
    value: 150,
    timestamp: Date.now(),
    tags: {
      endpoint: '/api/therapy',
      method: 'POST',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    analyticsService = new AnalyticsService()
  })

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      const eventId = await analyticsService.trackEvent(mockEvent)

      expect(eventId).toBeDefined()
      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        'analytics:events:queue',
        expect.stringContaining(mockEvent.userId),
      )
      expect(mockRedisClient.zadd).toHaveBeenCalledWith(
        `analytics:events:time:${mockEvent.type}`,
        expect.any(Number),
        expect.stringContaining(mockEvent.userId),
      )
    })

    it('should validate event data', async () => {
      const invalidEvent = {
        type: 'invalid',
        priority: 'invalid',
        timestamp: Date.now(),
        properties: {},
        metadata: {},
      }

      await expect(
        analyticsService.trackEvent(
          invalidEvent as unknown as {
            type: EventType
            priority: EventPriority
            timestamp: number
            properties: Record<string, unknown>
            metadata: Record<string, unknown>
          },
        ),
      ).rejects.toThrow()
    })

    it('should notify WebSocket subscribers', async () => {
      const ws = new WebSocket('ws://test')
      analyticsService.registerClient(mockEvent.userId, ws)

      await analyticsService.trackEvent(mockEvent)

      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining(mockEvent.userId),
      )
    })
  })

  describe('trackMetric', () => {
    it('should track a metric successfully', async () => {
      await analyticsService.trackMetric(mockMetric)

      expect(mockRedisClient.zadd).toHaveBeenCalledWith(
        `analytics:metrics:${mockMetric.name}`,
        expect.any(Number),
        expect.stringContaining(mockMetric.name),
      )
    })

    it('should store metric tags', async () => {
      await analyticsService.trackMetric(mockMetric)

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        `analytics:metrics:tags:${mockMetric.name}`,
        expect.any(String),
        expect.stringContaining('endpoint'),
      )
    })

    it('should validate metric data', async () => {
      const invalidMetric = {
        name: 123,
        value: 'invalid',
        timestamp: Date.now(),
        tags: {},
      }

      await expect(
        analyticsService.trackMetric(
          invalidMetric as unknown as {
            value: number
            timestamp: number
            name: string
            tags: Record<string, string>
          },
        ),
      ).rejects.toThrow()
    })
  })

  describe('processEvents', () => {
    it('should process queued events', async () => {
      const queuedEvent = {
        ...mockEvent,
        id: 'test-id',
        timestamp: Date.now(),
      }

      vi.mocked(mockRedisClient.lrange).mockResolvedValueOnce([
        JSON.stringify(queuedEvent),
      ])

      await analyticsService.processEvents()

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        `analytics:events:processed:${queuedEvent.type}`,
        queuedEvent.id,
        expect.stringContaining(queuedEvent.id),
      )
      expect(mockRedisClient.lrem).toHaveBeenCalledWith(
        'analytics:events:queue',
        1,
        expect.stringContaining(queuedEvent.id),
      )
    })

    it('should handle empty queue', async () => {
      vi.mocked(mockRedisClient.lrange).mockResolvedValueOnce([])

      await analyticsService.processEvents()

      expect(mockRedisClient.hset).not.toHaveBeenCalled()
      expect(mockRedisClient.lrem).not.toHaveBeenCalled()
    })

    it('should handle processing errors', async () => {
      vi.mocked(mockRedisClient.lrange).mockResolvedValueOnce(['invalid json'])

      await analyticsService.processEvents()

      const logger = getLogger('analytics')
      expect(logger.error).toHaveBeenCalledWith(
        'Error processing event:',
        expect.any(Error),
      )
    })
  })

  describe('getEvents', () => {
    it('should get events by type and time range', async () => {
      const events = [
        JSON.stringify({
          ...mockEvent,
          id: 'test-1',
          timestamp: Date.now(),
        }),
        JSON.stringify({
          ...mockEvent,
          id: 'test-2',
          timestamp: Date.now() - 1000,
        }),
      ]

      vi.mocked(mockRedisClient.zrangebyscore).mockResolvedValueOnce(events)

      const result = await analyticsService.getEvents({
        type: EventType.USER_ACTION,
      })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('test-1')
    })

    it('should handle time range and pagination', async () => {
      await analyticsService.getEvents({
        type: EventType.USER_ACTION,
        startTime: 1000,
        endTime: 2000,
        limit: 10,
        offset: 5,
      })

      expect(mockRedisClient.zrangebyscore).toHaveBeenCalledWith(
        'analytics:events:time:user_action',
        1000,
        2000,
        'LIMIT',
        5,
        10,
      )
    })
  })

  describe('getMetrics', () => {
    it('should get metrics by name and time range', async () => {
      const metrics = [
        JSON.stringify({
          ...mockMetric,
          timestamp: Date.now(),
        }),
        JSON.stringify({
          ...mockMetric,
          timestamp: Date.now() - 1000,
        }),
      ]

      vi.mocked(mockRedisClient.zrangebyscore).mockResolvedValueOnce(metrics)

      const result = await analyticsService.getMetrics({
        name: 'response_time',
      })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('response_time')
    })

    it('should filter metrics by tags', async () => {
      const metrics = [
        JSON.stringify({
          ...mockMetric,
          timestamp: Date.now(),
          tags: { endpoint: '/api/therapy' },
        }),
        JSON.stringify({
          ...mockMetric,
          timestamp: Date.now() - 1000,
          tags: { endpoint: '/api/auth' },
        }),
      ]

      vi.mocked(mockRedisClient.zrangebyscore).mockResolvedValueOnce(metrics)

      const result = await analyticsService.getMetrics({
        name: 'response_time',
        tags: { endpoint: '/api/therapy' },
      })

      expect(result).toHaveLength(1)
      expect(result[0].tags.endpoint).toBe('/api/therapy')
    })
  })

  describe('cleanup', () => {
    it('should clean up old events and metrics', async () => {
      vi.mocked(mockRedisClient.keys).mockResolvedValueOnce([
        'analytics:metrics:response_time',
        'analytics:metrics:tags:response_time',
      ])

      await analyticsService.cleanup()

      // Check event cleanup
      expect(mockRedisClient.zremrangebyscore).toHaveBeenCalledWith(
        'analytics:events:time:user_action',
        0,
        expect.any(Number),
      )

      // Check metric cleanup
      expect(mockRedisClient.zremrangebyscore).toHaveBeenCalledWith(
        'analytics:metrics:response_time',
        0,
        expect.any(Number),
      )
    })

    it('should handle cleanup errors', async () => {
      vi.mocked(mockRedisClient.zremrangebyscore).mockRejectedValueOnce(
        new Error('Cleanup error'),
      )

      await expect(analyticsService.cleanup()).rejects.toThrow('Cleanup error')
      const logger = getLogger('analytics')
      expect(logger.error).toHaveBeenCalledWith(
        'Error in analytics cleanup:',
        expect.any(Error),
      )
    })
  })

  describe('webSocket integration', () => {
    it('should register and unregister WebSocket clients', () => {
      const ws = new WebSocket('ws://test')
      const userId = 'test-user'

      analyticsService.registerClient(userId, ws)
      expect(analyticsService.hasClient(userId)).toBe(true)

      ws.emit('close')
      expect(analyticsService.hasClient(userId)).toBe(false)
    })

    it('should notify only relevant subscribers', async () => {
      const ws1 = new WebSocket('ws://test')
      const ws2 = new WebSocket('ws://test')
      const userId1 = 'user-1'
      const userId2 = 'user-2'

      analyticsService.registerClient(userId1, ws1)
      analyticsService.registerClient(userId2, ws2)

      await analyticsService.trackEvent({
        ...mockEvent,
        userId: userId1,
      })

      expect(ws1.send).toHaveBeenCalled()
      expect(ws2.send).not.toHaveBeenCalled()
    })
  })
})
