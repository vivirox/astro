import { env } from '@/config/env.config'
import { NotificationService } from '@/lib/services/notification/NotificationService'
import { WebSocketServer } from '@/lib/services/notification/WebSocketServer'
import { logger } from '@/lib/utils/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/services/notification/NotificationService')
vi.mock('@/lib/services/notification/WebSocketServer')
vi.mock('@/lib/utils/logger')
vi.mock('@/config/env.config')

// Mock process.exit to prevent tests from actually exiting
const mockExit = vi
  .spyOn(process, 'exit')
  .mockImplementation(() => undefined as never)

describe('notification-worker', () => {
  let mockNotificationService: NotificationService
  let mockWebSocketServer: WebSocketServer

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Reset environment variables
    vi.mocked(env).NOTIFICATION_WS_PORT = '8082'

    // Initialize mocks
    mockNotificationService = new NotificationService()
    mockWebSocketServer = new WebSocketServer(null, mockNotificationService)
  })

  describe('startWorker', () => {
    it('should start processing notifications at the specified interval', async () => {
      // Import worker module
      const worker = await import('../notification-worker')

      // Wait for initial setup
      await vi.runAllTimersAsync()

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting notification worker'),
      )

      // Verify WebSocket server initialization
      expect(WebSocketServer).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(NotificationService),
      )

      // Verify notification processing
      expect(mockNotificationService.processQueue).toHaveBeenCalled()
    })

    it('should handle startup errors gracefully', async () => {
      // Mock NotificationService constructor to throw error
      vi.mocked(NotificationService).mockImplementationOnce(() => {
        throw new Error('Startup error')
      })

      // Import worker module
      await import('../notification-worker')

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error starting notification worker'),
        expect.any(Error),
      )
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should handle processing errors gracefully', async () => {
      // Mock processQueue to throw error
      vi.mocked(mockNotificationService.processQueue).mockRejectedValueOnce(
        new Error('Processing error'),
      )

      // Import worker module
      await import('../notification-worker')

      // Wait for error to be logged
      await vi.runAllTimersAsync()

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing notifications'),
        expect.any(Error),
      )
    })
  })

  describe('shutdown handling', () => {
    it('should handle SIGTERM signal', async () => {
      // Import worker module
      await import('../notification-worker')

      // Simulate SIGTERM signal
      process.emit('SIGTERM', 'SIGTERM')

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Shutting down notification worker'),
      )
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should handle SIGINT signal', async () => {
      // Import worker module
      await import('../notification-worker')

      // Simulate SIGINT signal
      process.emit('SIGINT', 'SIGINT')

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Shutting down notification worker'),
      )
      expect(mockExit).toHaveBeenCalledWith(0)
    })

    it('should close WebSocket server on shutdown', async () => {
      // Import worker module
      await import('../notification-worker')

      // Simulate SIGTERM signal
      process.emit('SIGTERM', 'SIGTERM')

      expect(mockWebSocketServer.wss.close).toHaveBeenCalled()
    })
  })

  describe('environment configuration', () => {
    it('should use default WebSocket port if not configured', async () => {
      // Remove port from environment
      vi.mocked(env).NOTIFICATION_WS_PORT = undefined

      // Import worker module
      await import('../notification-worker')

      expect(WebSocketServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8082 }),
        expect.any(NotificationService),
      )
    })

    it('should use configured WebSocket port', async () => {
      // Set custom port in environment
      vi.mocked(env).NOTIFICATION_WS_PORT = '8090'

      // Import worker module
      await import('../notification-worker')

      expect(WebSocketServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8090 }),
        expect.any(NotificationService),
      )
    })
  })

  describe('error handling', () => {
    it('should continue processing after non-fatal errors', async () => {
      // Mock processQueue to throw error once then succeed
      vi.mocked(mockNotificationService.processQueue)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(undefined)

      // Import worker module
      await import('../notification-worker')

      // Wait for multiple processing cycles
      await vi.runAllTimersAsync()

      expect(mockNotificationService.processQueue).toHaveBeenCalledTimes(2)
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing notifications'),
        expect.any(Error),
      )
    })

    it('should handle WebSocket server errors', async () => {
      // Mock WebSocket server error
      const mockError = new Error('WebSocket error')
      mockWebSocketServer.wss.emit('error', mockError)

      // Import worker module
      await import('../notification-worker')

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket server error'),
        mockError,
      )
    })
  })
})
