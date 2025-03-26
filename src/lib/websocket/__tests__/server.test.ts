import type { Mock } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocket } from 'ws'
import { fheService } from '../../fhe'
import TherapyChatWebSocketServer from '../server'

// Mock dependencies
vi.mock('../../fhe')
vi.mock('../../logging')

describe('therapyChatWebSocketServer', () => {
  let wss: TherapyChatWebSocketServer
  let mockServer: any
  let mockWebSocket: WebSocket
  let mockClients: Map<string, WebSocket>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock WebSocket server
    mockServer = {
      on: vi.fn(),
    }

    // Mock WebSocket client
    mockWebSocket = {
      send: vi.fn(),
      on: vi.fn(),
      readyState: WebSocket.OPEN,
    } as unknown as WebSocket

    // Create server instance
    wss = new TherapyChatWebSocketServer(mockServer)

    // Store reference to clients map
    mockClients = (wss as any).clients
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('handleConnection', () => {
    it('should add new client on connection', () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      expect(mockClients.size).toBe(1)
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      )
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      )
    })

    it('should handle message events', async () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      // Get message handler
      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1]

      // Test chat message
      const chatMessage = {
        type: 'message',
        data: { content: 'test message' },
        sessionId: '123',
      }

      await messageHandler(JSON.stringify(chatMessage))
      expect(mockWebSocket.send).toHaveBeenCalled()
    })

    it('should handle encrypted messages with FHE', async () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1]

      const encryptedMessage = {
        type: 'message',
        data: { content: 'encrypted content' },
        sessionId: '123',
        encrypted: true,
      }

      // Mock FHE service
      const mockProcessedData = { content: 'processed content' }
      ;(fheService.processEncrypted as Mock).mockResolvedValue(
        mockProcessedData,
      )

      await messageHandler(JSON.stringify(encryptedMessage))

      expect(fheService.initialize).toHaveBeenCalled()
      expect(fheService.processEncrypted).toHaveBeenCalledWith(
        encryptedMessage.data,
        'CHAT',
      )
      expect(mockWebSocket.send).toHaveBeenCalled()
    })

    it('should handle status updates', async () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1]

      const statusMessage = {
        type: 'status',
        data: { status: 'typing' },
        sessionId: '123',
      }

      await messageHandler(JSON.stringify(statusMessage))
      expect(mockWebSocket.send).toHaveBeenCalled()
    })

    it('should handle client disconnection', () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      // Get close handler
      const closeHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'close',
      )[1]

      closeHandler()
      expect(mockClients.size).toBe(0)
    })

    it('should handle message parsing errors', async () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1]

      await messageHandler('invalid json')
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process message'),
      )
    })
  })

  describe('broadcast methods', () => {
    it('should broadcast to specific session', () => {
      const sessionId = '123'
      const clientId = '456'

      // Add client to session
      mockClients.set(clientId, mockWebSocket)
      ;(wss as any).sessions.set(sessionId, new Set([clientId]))

      // Broadcast message
      ;(wss as any).broadcastToSession(sessionId, {
        type: 'message',
        data: { content: 'test' },
      })

      expect(mockWebSocket.send).toHaveBeenCalled()
    })

    it('should broadcast to all clients', () => {
      // Add multiple clients
      mockClients.set('1', mockWebSocket)
      mockClients.set('2', { ...mockWebSocket, send: vi.fn() })

      // Broadcast message
      wss.broadcast({ id: '1', role: 'user', content: 'test' })

      expect(mockWebSocket.send).toHaveBeenCalled()
      expect(mockClients.get('2')?.send).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle FHE initialization errors', async () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1]

      // Mock FHE error
      ;(fheService.initialize as Mock).mockRejectedValue(new Error('FHE error'))

      const encryptedMessage = {
        type: 'message',
        data: { content: 'test' },
        sessionId: '123',
        encrypted: true,
      }

      await messageHandler(JSON.stringify(encryptedMessage))
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('Encryption error'),
      )
    })

    it('should handle missing session ID', async () => {
      const handleConnection = (wss as any).handleConnection.bind(wss)
      handleConnection(mockWebSocket)

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )[1]

      const message = {
        type: 'message',
        data: { content: 'test' },
      }

      await messageHandler(JSON.stringify(message))
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('Session ID required'),
      )
    })
  })
})
