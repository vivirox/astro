import { logger } from '@/lib/utils/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket, WebSocketServer as WSServer } from 'ws'
import { NotificationService } from '../NotificationService'
import { WebSocketServer } from '../WebSocketServer'

// Mock dependencies
vi.mock('ws')
vi.mock('../NotificationService')
vi.mock('@/lib/utils/logger')

describe('webSocketServer', () => {
  let wsServer: WebSocketServer
  let mockWsServer: WSServer
  let mockNotificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    mockWsServer = new WSServer({ port: 8082 })
    mockNotificationService = new NotificationService()
    wsServer = new WebSocketServer(mockWsServer, mockNotificationService)
  })

  describe('constructor', () => {
    it('should initialize with provided server and notification service', () => {
      expect(wsServer.wss).toBe(mockWsServer)
      expect(wsServer.notificationService).toBe(mockNotificationService)
    })

    it('should set up connection handler', () => {
      expect(mockWsServer.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function),
      )
    })

    it('should set up error handler', () => {
      expect(mockWsServer.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      )
    })
  })

  describe('handleConnection', () => {
    let mockWs: WebSocket
    const mockToken = 'valid-token'
    const mockUserId = 'test-user'

    beforeEach(() => {
      mockWs = new WebSocket(null)
      vi.mocked(mockWs.on).mockImplementation((event, handler) => {
        if (event === 'message') {
          // Simulate authentication message
          handler(
            JSON.stringify({
              type: 'authenticate',
              token: mockToken,
            }),
          )
        }
        return mockWs
      })
    })

    it('should handle client authentication', async () => {
      // Mock verifyToken to return userId
      vi.spyOn(wsServer as any, 'verifyToken').mockResolvedValueOnce(mockUserId)

      await wsServer.handleConnection(mockWs)

      expect(wsServer.verifyToken).toHaveBeenCalledWith(mockToken)
      expect(mockNotificationService.registerClient).toHaveBeenCalledWith(
        mockUserId,
        mockWs,
      )
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('authenticated'),
      )
    })

    it('should handle invalid authentication token', async () => {
      // Mock verifyToken to throw error
      vi.spyOn(wsServer as any, 'verifyToken').mockRejectedValueOnce(
        new Error('Invalid token'),
      )

      await wsServer.handleConnection(mockWs)

      expect(mockWs.close).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed'),
      )
    })

    it('should handle client messages after authentication', async () => {
      // Mock verifyToken to return userId
      vi.spyOn(wsServer as any, 'verifyToken').mockResolvedValueOnce(mockUserId)

      await wsServer.handleConnection(mockWs)

      // Simulate message handler
      const messageHandler = vi
        .mocked(mockWs.on)
        .mock.calls.find((call) => call[0] === 'message')?.[1] as (
        data: string,
      ) => void

      // Test mark as read message
      messageHandler(
        JSON.stringify({
          type: 'markAsRead',
          notificationId: 'test-id',
        }),
      )

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        mockUserId,
        'test-id',
      )

      // Test get notifications message
      messageHandler(
        JSON.stringify({
          type: 'getNotifications',
          limit: 10,
          offset: 0,
        }),
      )

      expect(mockNotificationService.getNotifications).toHaveBeenCalledWith(
        mockUserId,
        10,
        0,
      )
    })

    it('should handle client disconnection', async () => {
      // Mock verifyToken to return userId
      vi.spyOn(wsServer as any, 'verifyToken').mockResolvedValueOnce(mockUserId)

      await wsServer.handleConnection(mockWs)

      // Simulate close handler
      const closeHandler = vi
        .mocked(mockWs.on)
        .mock.calls.find((call) => call[0] === 'close')?.[1] as () => void

      closeHandler()

      expect(mockNotificationService.unregisterClient).toHaveBeenCalledWith(
        mockUserId,
      )
    })

    it('should handle message parsing errors', async () => {
      // Mock verifyToken to return userId
      vi.spyOn(wsServer as any, 'verifyToken').mockResolvedValueOnce(mockUserId)

      await wsServer.handleConnection(mockWs)

      // Simulate message handler with invalid JSON
      const messageHandler = vi
        .mocked(mockWs.on)
        .mock.calls.find((call) => call[0] === 'message')?.[1] as (
        data: string,
      ) => void

      messageHandler('invalid json')

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing message'),
      )
    })

    it('should handle unknown message types', async () => {
      // Mock verifyToken to return userId
      vi.spyOn(wsServer as any, 'verifyToken').mockResolvedValueOnce(mockUserId)

      await wsServer.handleConnection(mockWs)

      // Simulate message handler with unknown type
      const messageHandler = vi
        .mocked(mockWs.on)
        .mock.calls.find((call) => call[0] === 'message')?.[1] as (
        data: string,
      ) => void

      messageHandler(
        JSON.stringify({
          type: 'unknown',
        }),
      )

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown message type'),
      )
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const mockUserId = 'test-user'
      const mockToken = 'valid-token'

      // Mock token verification
      vi.spyOn(wsServer as any, 'verifyToken').mockResolvedValueOnce(mockUserId)

      const result = await wsServer.verifyToken(mockToken)

      expect(result).toBe(mockUserId)
    })

    it('should reject invalid token', async () => {
      const mockToken = 'invalid-token'

      // Mock token verification to throw error
      vi.spyOn(wsServer as any, 'verifyToken').mockRejectedValueOnce(
        new Error('Invalid token'),
      )

      await expect(wsServer.verifyToken(mockToken)).rejects.toThrow(
        'Invalid token',
      )
    })
  })

  describe('sendUnreadCount', () => {
    it('should send unread count to client', async () => {
      const mockWs = new WebSocket(null)
      const mockUserId = 'test-user'
      const mockCount = 5

      // Mock getUnreadCount
      vi.mocked(mockNotificationService.getUnreadCount).mockResolvedValueOnce(
        mockCount,
      )

      await wsServer.sendUnreadCount(mockUserId, mockWs)

      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(
        mockUserId,
      )
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'unreadCount',
          count: mockCount,
        }),
      )
    })

    it('should handle errors when getting unread count', async () => {
      const mockWs = new WebSocket(null)
      const mockUserId = 'test-user'

      // Mock getUnreadCount to throw error
      vi.mocked(mockNotificationService.getUnreadCount).mockRejectedValueOnce(
        new Error('Database error'),
      )

      await wsServer.sendUnreadCount(mockUserId, mockWs)

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error getting unread count'),
      )
    })
  })

  describe('handleError', () => {
    it('should log server errors', () => {
      const mockError = new Error('Server error')

      wsServer.handleError(mockError)

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket server error'),
        mockError,
      )
    })
  })
})
