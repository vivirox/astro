import logger from '@/lib/utils/logger'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { WebSocket, WebSocketServer as WSServer } from 'ws'
import { NotificationService } from '../NotificationService'
import type { IncomingMessage } from 'http'
import type { Server } from 'ws'

// Mock dependencies
vi.mock('ws', () => {
  const mockServer = {
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set(),
    emit: vi.fn(),
  }

  return {
    WebSocketServer: vi.fn(() => mockServer),
    WebSocket: vi.fn(),
  }
})

vi.mock('../NotificationService')
vi.mock('@/lib/utils/logger', () => ({
  default: {
    getLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}))

type WSEventHandler = (ws: WebSocket, req: IncomingMessage) => void
type WSErrorHandler = (error: Error) => void
type WSMessageHandler = (data: string) => void
type WSCloseHandler = () => void

type MockCall = [
  string,
  WSEventHandler | WSErrorHandler | WSMessageHandler | WSCloseHandler,
]

// Helper type for mocked WebSocket server
type MockedWSServer = Server<typeof WebSocket, typeof IncomingMessage> & {
  on: Mock
  mock: {
    calls: MockCall[]
    instances: MockedWSServer[]
  }
}

// Helper function to type-check mock calls
const findMockCall = (calls: unknown[], type: string): MockCall | undefined => {
  return calls.find(
    (call): call is MockCall =>
      Array.isArray(call) && call.length === 2 && call[0] === type,
  )
}

describe('WebSocketServer', () => {
  let mockPort: number
  let mockNotificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    mockPort = 8082
    mockNotificationService = new NotificationService()
  })

  describe('constructor', () => {
    it('should initialize with provided port and notification service', () => {
      expect(WSServer).toHaveBeenCalledWith({ port: mockPort })
      expect(logger.getLogger('websocket').info).toHaveBeenCalledWith(
        'WebSocket server started',
        { port: mockPort },
      )
    })

    it('should set up connection handler', () => {
      const wsInstance = vi.mocked(WSServer).mock
        .instances[0] as unknown as MockedWSServer
      expect(wsInstance.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function),
      )
    })

    it('should set up error handler', () => {
      const wsInstance = vi.mocked(WSServer).mock
        .instances[0] as unknown as MockedWSServer
      expect(wsInstance.on).toHaveBeenCalledWith('error', expect.any(Function))
    })
  })

  describe('connection handling', () => {
    let mockWs: WebSocket & {
      send: Mock
      close: Mock
      on: Mock
    }
    let mockReq: IncomingMessage
    const mockToken = 'valid-token'
    const mockUserId = 'test-user'

    beforeEach(() => {
      mockWs = new WebSocket(null) as unknown as WebSocket & {
        send: Mock
        close: Mock
        on: Mock
      }
      mockReq = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      } as IncomingMessage

      vi.mocked(mockWs.on).mockImplementation(
        (event: string, listener: WSMessageHandler | WSCloseHandler) => {
          if (event === 'message') {
            listener.bind(mockWs)(
              JSON.stringify({
                type: 'mark_read',
                notificationId: 'test-id',
              }),
            )
          }
          return mockWs
        },
      )
    })

    it('should handle client authentication', async () => {
      const wsInstance = vi.mocked(WSServer).mock
        .instances[0] as unknown as MockedWSServer
      const connectionHandler = wsInstance.on.mock.calls.find(
        (call): call is [string, WSEventHandler] => call[0] === 'connection',
      )?.[1] as WSEventHandler

      if (!connectionHandler) {
        throw new Error('Connection handler not found')
      }

      connectionHandler.bind(wsInstance)(mockWs, mockReq)

      expect(mockNotificationService.registerClient).toHaveBeenCalledWith(
        mockUserId,
        mockWs,
      )
    })

    it('should handle client messages', () => {
      const wsInstance = vi.mocked(WSServer).mock
        .instances[0] as unknown as MockedWSServer
      const connectionHandler = findMockCall(
        wsInstance.on.mock.calls,
        'connection',
      )?.[1] as WSEventHandler

      if (!connectionHandler) {
        throw new Error('Connection handler not found')
      }

      connectionHandler.bind(wsInstance)(mockWs, mockReq)

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        mockUserId,
        'test-id',
      )
    })

    it('should handle client disconnection', () => {
      const wsInstance = vi.mocked(WSServer).mock
        .instances[0] as unknown as MockedWSServer
      const connectionHandler = findMockCall(
        wsInstance.on.mock.calls,
        'connection',
      )?.[1] as WSEventHandler

      if (!connectionHandler) {
        throw new Error('Connection handler not found')
      }

      connectionHandler.bind(wsInstance)(mockWs, mockReq)

      const closeHandler = findMockCall(
        vi.mocked(mockWs.on).mock.calls,
        'close',
      )?.[1] as WSCloseHandler

      if (closeHandler) {
        closeHandler.bind(mockWs)()
      }

      expect(mockNotificationService.unregisterClient).toHaveBeenCalledWith(
        mockUserId,
      )
    })
  })

  describe('error handling', () => {
    it('should log server errors', () => {
      const wsInstance = vi.mocked(WSServer).mock
        .instances[0] as unknown as MockedWSServer
      const errorHandler = findMockCall(
        wsInstance.on.mock.calls,
        'error',
      )?.[1] as WSErrorHandler

      if (!errorHandler) {
        throw new Error('Error handler not found')
      }

      const mockError = new Error('Server error')
      errorHandler.bind(wsInstance)(mockError)

      expect(logger.getLogger('websocket').error).toHaveBeenCalledWith(
        'WebSocket server error',
        { error: mockError.message },
      )
    })
  })
})
