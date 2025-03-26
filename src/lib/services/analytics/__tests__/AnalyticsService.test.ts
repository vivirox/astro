import { redis } from '@/lib/services/redis'
import { logger } from '@/lib/utils/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { AnalyticsService, EventPriority, EventType } from '../AnalyticsService'

// Mock dependencies
vi.mock('@/lib/services/redis')
vi.mock('@/lib/utils/logger')
vi.mock('ws')

describe('analyticsService', () => {
  let analyticsService: AnalyticsService

  const mockEvent = {
    type: EventType.USER_ACTION,
    priority: EventPriority.NORMAL,
    userId: 'test-user',
    sessionId: 'test-session',
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
      expect(redis.lpush).toHaveBeenCalledWith(
        'analytics:events:queue',
        expect.stringContaining(mockEvent.userId),
      )
      expect(redis.zadd).toHaveBeenCalledWith(
        `analytics:events:time:${mockEvent.type}`,
        expect.any(Number),
        expect.stringContaining(mockEvent.userId),
      )
    })

    it('should validate event data', async () => {
      const invalidEvent = {
        type: 'invalid',
        priority: 'invalid',
      }

      await expect(
        analyticsService.trackEvent(invalidEvent as any),
      ).rejects.toThrow()
    })

    it('should notify WebSocket subscribers', async () => {
      const ws = new WebSocket(null)
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

      expect(redis.zadd).toHaveBeenCalledWith(
        `analytics:metrics:${mockMetric.name}`,
        expect.any(Number),
        expect.stringContaining(mockMetric.name),
      )
    })

    it('should store metric tags', async () => {
      await analyticsService.trackMetric(mockMetric)

      expect(redis.hset).toHaveBeenCalledWith(
        `analytics:metrics:tags:${mockMetric.name}`,
        expect.any(String),
        expect.stringContaining('endpoint'),
      )
    })

    it('should validate metric data', async () => {
      const invalidMetric = {
        name: 123,
        value: 'invalid',
      }

      await expect(
        analyticsService.trackMetric(invalidMetric as any),
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

      vi.mocked(redis.lrange).mockResolvedValueOnce([
        JSON.stringify(queuedEvent),
      ])

      await analyticsService.processEvents()

      expect(redis.hset).toHaveBeenCalledWith(
        `analytics:events:processed:${queuedEvent.type}`,
        queuedEvent.id,
        expect.stringContaining(queuedEvent.id),
      )
      expect(redis.lrem).toHaveBeenCalledWith(
        'analytics:events:queue',
        1,
        expect.stringContaining(queuedEvent.id),
      )
    })

    it('should handle empty queue', async () => {
      vi.mocked(redis.lrange).mockResolvedValueOnce([])

      await analyticsService.processEvents()

      expect(redis.hset).not.toHaveBeenCalled()
      expect(redis.lrem).not.toHaveBeenCalled()
    })

    it('should handle processing errors', async () => {
      vi.mocked(redis.lrange).mockResolvedValueOnce(['invalid json'])

      await analyticsService.processEvents()

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

      vi.mocked(redis.zrangebyscore).mockResolvedValueOnce(events)

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

      expect(redis.zrangebyscore).toHaveBeenCalledWith(
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

      vi.mocked(redis.zrangebyscore).mockResolvedValueOnce(metrics)

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

      vi.mocked(redis.zrangebyscore).mockResolvedValueOnce(metrics)

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
      vi.mocked(redis.keys).mockResolvedValueOnce([
        'analytics:metrics:response_time',
        'analytics:metrics:tags:response_time',
      ])

      await analyticsService.cleanup()

      // Check event cleanup
      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        'analytics:events:time:user_action',
        0,
        expect.any(Number),
      )

      // Check metric cleanup
      expect(redis.zremrangebyscore).toHaveBeenCalledWith(
        'analytics:metrics:response_time',
        0,
        expect.any(Number),
      )
    })

    it('should handle cleanup errors', async () => {
      vi.mocked(redis.zremrangebyscore).mockRejectedValueOnce(
        new Error('Cleanup error'),
      )

      await expect(analyticsService.cleanup()).rejects.toThrow('Cleanup error')
      expect(logger.error).toHaveBeenCalledWith(
        'Error in analytics cleanup:',
        expect.any(Error),
      )
    })
  })

  describe('webSocket integration', () => {
    it('should register and unregister WebSocket clients', () => {
      const ws = new WebSocket(null)
      const userId = 'test-user'

      analyticsService.registerClient(userId, ws)
      expect(analyticsService.wsClients.get(userId)).toBe(ws)

      ws.emit('close')
      expect(analyticsService.wsClients.get(userId)).toBeUndefined()
    })

    it('should notify only relevant subscribers', async () => {
      const ws1 = new WebSocket(null)
      const ws2 = new WebSocket(null)
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
