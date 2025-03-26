import type { NotificationService } from './NotificationService'
import { logger } from '@/lib/utils/logger'
import { WebSocketServer as WSServer } from 'ws'

export class WebSocketServer {
  private wss: WSServer
  private notificationService: NotificationService

  constructor(port: number, notificationService: NotificationService) {
    this.notificationService = notificationService
    this.wss = new WSServer({ port })

    this.wss.on('connection', this.handleConnection.bind(this))
    this.wss.on('error', this.handleError.bind(this))

    logger.info('WebSocket server started', { port })
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: Request): void {
    // Extract user ID from request
    const userId = this.getUserId(req)
    if (!userId) {
      ws.close(1008, 'Unauthorized')
      return
    }

    // Register client with notification service
    this.notificationService.registerClient(userId, ws)

    logger.info('WebSocket client connected', { userId })

    // Handle client messages
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data)
        this.handleMessage(userId, message, ws)
      } catch (error) {
        logger.error('Failed to parse WebSocket message', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    // Handle client disconnection
    ws.on('close', () => {
      logger.info('WebSocket client disconnected', { userId })
    })

    // Handle client errors
    ws.on('error', (error) => {
      logger.error('WebSocket client error', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    })

    // Send initial unread count
    this.sendUnreadCount(userId, ws)
  }

  /**
   * Handle WebSocket server errors
   */
  private handleError(error: Error): void {
    logger.error('WebSocket server error', {
      error: error.message,
    })
  }

  /**
   * Handle client messages
   */
  private async handleMessage(
    userId: string,
    message: any,
    ws: WebSocket,
  ): Promise<void> {
    switch (message.type) {
      case 'mark_read':
        if (typeof message.notificationId === 'string') {
          await this.notificationService.markAsRead(
            userId,
            message.notificationId,
          )
          await this.sendUnreadCount(userId, ws)
        }
        break

      case 'get_notifications':
        const notifications = await this.notificationService.getNotifications(
          userId,
          message.limit,
          message.offset,
        )
        ws.send(
          JSON.stringify({
            type: 'notifications',
            data: notifications,
          }),
        )
        break

      default:
        logger.warn('Unknown WebSocket message type', {
          userId,
          type: message.type,
        })
    }
  }

  /**
   * Send unread notification count to client
   */
  private async sendUnreadCount(userId: string, ws: WebSocket): Promise<void> {
    const count = await this.notificationService.getUnreadCount(userId)
    ws.send(
      JSON.stringify({
        type: 'unread_count',
        data: count,
      }),
    )
  }

  /**
   * Extract user ID from request
   * This should be replaced with proper authentication
   */
  private getUserId(req: Request): string | null {
    // TODO: Implement proper authentication
    const url = new URL(req.url, `http://${req.headers.host}`)
    return url.searchParams.get('userId')
  }

  /**
   * Close the WebSocket server
   */
  close(): void {
    this.wss.close()
  }
}
