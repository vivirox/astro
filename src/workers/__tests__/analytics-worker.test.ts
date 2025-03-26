import { env } from '@/config/env.config'
import { AnalyticsService } from '@/lib/services/analytics/AnalyticsService'
import { logger } from '@/lib/utils/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketServer } from 'ws'

// Mock dependencies
vi.mock('@/lib/services/analytics/AnalyticsService')
vi.mock('ws')
vi.mock('@/lib/utils/logger')
vi.mock('@/config/env.config')

// Mock process.exit to prevent tests from actually exiting
const mockExit = vi
  .spyOn(process, 'exit')
  .mockImplementation(() => undefined as never)

describe('analytics-worker', () => {
  let mockAnalyticsService: AnalyticsService
  let mockWebSocketServer: WebSocketServer

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Reset environment variables
    vi.mocked(env).ANALYTICS_WS_PORT = '8083'

    // Initialize mocks
    mockAnalyticsService = new AnalyticsService()
    mockWebSocketServer = new WebSocketServer({ port: 8083 })
  })

  describe('startWorker', () => {
    it('should start processing analytics events at the specified interval', async () => {
      // Import worker module
      const worker = await import('../analytics-worker')

      // Wait for initial setup
      await vi.runAllTimersAsync()

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting analytics worker'),
      )

      // Verify WebSocket server initialization
      expect(WebSocketServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8083 }),
      )

      // Verify event processing
      expect(mockAnalyticsService.processEvents).toHaveBeenCalled()
    })

    it('should handle startup errors gracefully', async () => {
      // Mock AnalyticsService constructor to throw error
      vi.mocked(AnalyticsService).mockImplementationOnce(() => {
        throw new Error('Startup error')
      })

      // Import worker module
      await import('../analytics-worker')

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error starting analytics worker'),
        expect.any(Error),
      )
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should handle processing errors gracefully', async () => {
      // Mock processEvents to throw error
      vi.mocked(mockAnalyticsService.processEvents).mockRejectedValueOnce(
        new Error('Processing error'),
      )

      // Import worker module
      await import('../analytics-worker')

      // Wait for error to be logged
      await vi.runAllTimersAsync()

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing analytics events'),
        expect.any(Error),
      )
    })
  })

  describe('shutdown handling', () => {
    it('should handle SIGTERM signal', async () => {
      // Import worker module
      await import('../analytics-worker')

      // Simulate SIGTERM signal
      process.emit('SIGTERM', 'SIGTERM')

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Shutting down analytics worker'),
      )
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should handle SIGINT signal', async () => {
      // Import worker module
      await import('../analytics-worker')

      // Simulate SIGINT signal
      process.emit('SIGINT', 'SIGINT')

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Shutting down analytics worker'),
      )
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should close WebSocket server on shutdown', async () => {
      // Import worker module
      await import('../analytics-worker')

      // Simulate SIGTERM signal
      process.emit('SIGTERM', 'SIGTERM')

      expect(mockWebSocketServer.close).toHaveBeenCalled()
    })
  })

  describe('environment configuration', () => {
    it('should use default WebSocket port if not configured', async () => {
      // Remove port from environment
      vi.mocked(env).ANALYTICS_WS_PORT = undefined

      // Import worker module
      await import('../analytics-worker')

      expect(WebSocketServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8083 }),
      )
    })

    it('should use configured WebSocket port', async () => {
      // Set custom port in environment
      vi.mocked(env).ANALYTICS_WS_PORT = '8090'

      // Import worker module
      await import('../analytics-worker')

      expect(WebSocketServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8090 }),
      )
    })
  })

  describe('webSocket handling', () => {
    it('should handle client authentication', async () => {
      // Import worker module
      const worker = await import('../analytics-worker')

      // Simulate WebSocket connection
      const mockWs = {
        once: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      }

      // Trigger connection handler
      const connectionHandler = vi
        .mocked(mockWebSocketServer.on)
        .mock.calls.find((call) => call[0] === 'connection')?.[1] as (
        ws: any,
      ) => void

      connectionHandler(mockWs)

      // Simulate authentication message
      const messageHandler = mockWs.once.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1] as (data: any) => void

      messageHandler(
        JSON.stringify({
          type: 'authenticate',
          userId: 'test-user',
        }),
      )

      expect(mockAnalyticsService.registerClient).toHaveBeenCalledWith(
        'test-user',
        mockWs,
      )
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('authenticated'),
      )
    })

    it('should handle invalid authentication', async () => {
      // Import worker module
      const worker = await import('../analytics-worker')

      // Simulate WebSocket connection
      const mockWs = {
        once: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
      }

      // Trigger connection handler
      const connectionHandler = vi
        .mocked(mockWebSocketServer.on)
        .mock.calls.find((call) => call[0] === 'connection')?.[1] as (
        ws: any,
      ) => void

      connectionHandler(mockWs)

      // Simulate invalid authentication message
      const messageHandler = mockWs.once.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1] as (data: any) => void

      messageHandler(
        JSON.stringify({
          type: 'invalid',
        }),
      )

      expect(mockAnalyticsService.registerClient).not.toHaveBeenCalled()
      expect(mockWs.close).toHaveBeenCalled()
    })

    it('should handle WebSocket server errors', async () => {
      // Import worker module
      await import('../analytics-worker')

      // Simulate WebSocket server error
      const mockError = new Error('WebSocket error')
      mockWebSocketServer.emit('error', mockError)

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket server error'),
        mockError,
      )
    })
  })

  describe('cleanup handling', () => {
    it('should run cleanup at specified interval', async () => {
      // Import worker module
      await import('../analytics-worker')

      // Wait for cleanup to be called
      await vi.runAllTimersAsync()

      expect(mockAnalyticsService.cleanup).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      // Mock cleanup to throw error
      vi.mocked(mockAnalyticsService.cleanup).mockRejectedValueOnce(
        new Error('Cleanup error'),
      )

      // Import worker module
      await import('../analytics-worker')

      // Wait for error to be logged
      await vi.runAllTimersAsync()

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error cleaning up analytics data'),
        expect.any(Error),
      )
    })
  })
})
