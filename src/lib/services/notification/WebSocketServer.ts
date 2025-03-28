import type { NotificationService } from './NotificationService'
import logger from '@/lib/utils/logger'
import type { WebSocket } from 'ws'
import { WebSocketServer as WSServer } from 'ws'
import type { IncomingMessage } from 'http'
import { z } from 'zod'

// Define message types using Zod for runtime validation
const BaseMessageSchema = z.object({
  type: z.string(),
})

const MarkReadMessageSchema = BaseMessageSchema.extend({
  type: z.literal('mark_read'),
  notificationId: z.string(),
})

const GetNotificationsMessageSchema = BaseMessageSchema.extend({
  type: z.literal('get_notifications'),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

const ClientMessageSchema = z.discriminatedUnion('type', [
  MarkReadMessageSchema,
  GetNotificationsMessageSchema,
])

type ClientMessage = z.infer<typeof ClientMessageSchema>

// Server message types
interface ServerMessage {
  type: string
  [key: string]: unknown
}

interface _ErrorMessage extends ServerMessage {
  type: 'error'
  message: string
}

interface _UnreadCountMessage extends ServerMessage {
  type: 'unreadCount'
  count: number
}

interface _NotificationsMessage extends ServerMessage {
  type: 'notifications'
  data: unknown[]
}

export class WebSocketServer {
  private wss: WSServer
  private notificationService: NotificationService

  constructor(port: number, notificationService: NotificationService) {
    this.notificationService = notificationService
    this.wss = new WSServer({ port })

    this.wss.on('connection', this.handleConnection.bind(this))
    this.wss.on('error', this.handleServerError.bind(this))

    logger.getLogger('websocket').info('WebSocket server started', { port })
  }

  /**
   * Handle server-level errors
   */
  private handleServerError(error: Error): void {
    logger.getLogger('websocket').error('WebSocket server error', {
      error: error.message,
    })
  }

  /**
   * Send a message to a WebSocket client
   */
  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message))
    } catch (error) {
      logger.getLogger('websocket').error('Failed to send message to client', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Send an error message to a WebSocket client
   */
  private sendError(ws: WebSocket, message: string): void {
    this.sendMessage(ws, {
      type: 'error',
      message,
    })
  }

  /**
   * Extract auth token from request
   */
  private getAuthToken(req: IncomingMessage): string | null {
    const header = req.headers['authorization']
    if (!header) return null
    const [type, token] = header.split(' ')
    return type === 'Bearer' ? token : null
  }

  /**
   * Verify the authentication token
   */
  private async verifyToken(token: string): Promise<string> {
    // Implementation depends on your auth system
    // This is a placeholder that should be replaced with actual token verification
    try {
      // Replace this with your actual token verification logic
      console.log(`Verifying token: ${token}`)
      const userId = 'placeholder-user-id' // This should come from your token verification
      return userId
    } catch (_error) {
      throw new Error('Invalid token')
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const token = this.getAuthToken(req)
    if (!token) {
      this.sendError(ws, 'No authentication token provided')
      ws.close(1008, 'Unauthorized - No token provided')
      return
    }

    this.verifyToken(token)
      .then((userId: string) => this.setupAuthenticatedConnection(userId, ws))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        this.sendError(ws, `Authentication failed: ${message}`)
        ws.close(1008, 'Unauthorized - Token verification failed')
      })
  }

  /**
   * Set up an authenticated WebSocket connection
   */
  private setupAuthenticatedConnection(userId: string, ws: WebSocket): void {
    if (!userId) {
      this.sendError(ws, 'Invalid user ID')
      ws.close(1008, 'Unauthorized - Invalid user ID')
      return
    }

    this.notificationService.registerClient(userId, ws as unknown as WebSocket)
    logger.getLogger('websocket').info('WebSocket client connected', { userId })

    ws.on('message', (data: string) =>
      this.handleClientMessage(userId, data, ws),
    )
    ws.on('close', () => this.handleClientDisconnection(userId))
    ws.on('error', (error: Error) => this.handleClientError(userId, error))

    this.sendUnreadCount(userId, ws)
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(userId: string): void {
    this.notificationService.unregisterClient(userId)
    logger.getLogger('websocket').info('WebSocket client disconnected', {
      userId,
    })
  }

  /**
   * Handle client-level errors
   */
  private handleClientError(userId: string, error: Error): void {
    logger.getLogger('websocket').error('WebSocket client error', {
      userId,
      error: error.message,
    })
  }

  /**
   * Send unread count to client
   */
  private async sendUnreadCount(userId: string, ws: WebSocket): Promise<void> {
    try {
      const count = await this.notificationService.getUnreadCount(userId)
      this.sendMessage(ws, { type: 'unreadCount', count })
    } catch (error) {
      logger.getLogger('websocket').error('Failed to send unread count', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Handle client message
   */
  private handleClientMessage(
    userId: string,
    data: string,
    ws: WebSocket,
  ): void {
    try {
      const message: unknown = JSON.parse(data)
      const validatedMessage = ClientMessageSchema.parse(message)
      this.processMessage(userId, validatedMessage, ws)
    } catch (error) {
      logger.getLogger('websocket').error('Invalid message received', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      this.sendError(ws, 'Invalid message format')
    }
  }

  /**
   * Handle mark read message
   */
  private async handleMarkRead(
    userId: string,
    notificationId: string,
    ws: WebSocket,
  ): Promise<void> {
    await this.notificationService.markAsRead(userId, notificationId)
    await this.sendUnreadCount(userId, ws)
  }

  /**
   * Handle get notifications message
   */
  private async handleGetNotifications(
    userId: string,
    message: z.infer<typeof GetNotificationsMessageSchema>,
    ws: WebSocket,
  ): Promise<void> {
    const notifications = await this.notificationService.getNotifications(
      userId,
      message.limit,
      message.offset,
    )
    this.sendMessage(ws, { type: 'notifications', data: notifications })
  }

  /**
   * Process validated client message
   */
  private async processMessage(
    userId: string,
    message: ClientMessage,
    ws: WebSocket,
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'mark_read':
          await this.handleMarkRead(userId, message.notificationId, ws)
          break
        case 'get_notifications':
          await this.handleGetNotifications(userId, message, ws)
          break
        default: {
          const type = (message as { type: string }).type
          this.sendError(ws, `Unknown type: ${type}`)
        }
      }
    } catch (error) {
      logger.getLogger('websocket').error('Error processing message', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      this.sendError(ws, 'Error processing message')
    }
  }
}
