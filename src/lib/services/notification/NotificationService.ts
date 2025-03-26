import type { WebSocket } from 'ws'
import { env } from '@/config/env.config'
import { EmailService } from '@/lib/services/email/EmailService'
import { redis } from '@/lib/services/redis'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

// Notification channel types
export const NotificationChannel = {
  IN_APP: 'in_app',
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
} as const

// Notification priority levels
export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const

// Notification status types
export const NotificationStatus = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  READ: 'read',
} as const

// Notification template schema
const NotificationTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  channels: z.array(
    z.enum([
      NotificationChannel.IN_APP,
      NotificationChannel.PUSH,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ]),
  ),
  priority: z.enum([
    NotificationPriority.LOW,
    NotificationPriority.NORMAL,
    NotificationPriority.HIGH,
    NotificationPriority.URGENT,
  ]),
  metadata: z.record(z.unknown()).optional(),
})

type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>

// Notification data schema
const NotificationDataSchema = z.object({
  userId: z.string(),
  templateId: z.string(),
  data: z.record(z.unknown()),
  channels: z
    .array(
      z.enum([
        NotificationChannel.IN_APP,
        NotificationChannel.PUSH,
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
      ]),
    )
    .optional(),
  priority: z
    .enum([
      NotificationPriority.LOW,
      NotificationPriority.NORMAL,
      NotificationPriority.HIGH,
      NotificationPriority.URGENT,
    ])
    .optional(),
})

type NotificationData = z.infer<typeof NotificationDataSchema>

// Notification item schema
const NotificationItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  templateId: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()),
  channels: z.array(
    z.enum([
      NotificationChannel.IN_APP,
      NotificationChannel.PUSH,
      NotificationChannel.EMAIL,
      NotificationChannel.SMS,
    ]),
  ),
  priority: z.enum([
    NotificationPriority.LOW,
    NotificationPriority.NORMAL,
    NotificationPriority.HIGH,
    NotificationPriority.URGENT,
  ]),
  status: z.enum([
    NotificationStatus.PENDING,
    NotificationStatus.DELIVERED,
    NotificationStatus.FAILED,
    NotificationStatus.READ,
  ]),
  createdAt: z.number(),
  deliveredAt: z.number().nullable(),
  readAt: z.number().nullable(),
  error: z.string().nullable(),
})

type NotificationItem = z.infer<typeof NotificationItemSchema>

export class NotificationService {
  private emailService: EmailService
  private wsClients: Map<string, WebSocket>
  private templates: Map<string, NotificationTemplate>
  private queueKey = 'notification:queue'
  private processingKey = 'notification:processing'

  constructor() {
    this.emailService = new EmailService()
    this.wsClients = new Map()
    this.templates = new Map()
  }

  /**
   * Register a WebSocket client for a user
   */
  registerClient(userId: string, ws: WebSocket): void {
    this.wsClients.set(userId, ws)

    ws.on('close', () => {
      this.wsClients.delete(userId)
    })
  }

  /**
   * Register a notification template
   */
  async registerTemplate(template: NotificationTemplate): Promise<void> {
    // Validate template
    NotificationTemplateSchema.parse(template)

    // Store template
    this.templates.set(template.id, template)

    // If template includes email channel, register email template
    if (template.channels.includes(NotificationChannel.EMAIL)) {
      await this.emailService.upsertTemplate({
        alias: template.id,
        subject: template.title,
        htmlBody: template.body,
        from: env.EMAIL_FROM_ADDRESS,
      })
    }
  }

  /**
   * Queue a notification for delivery
   */
  async queueNotification(data: NotificationData): Promise<string> {
    // Validate notification data
    NotificationDataSchema.parse(data)

    // Get template
    const template = this.templates.get(data.templateId)
    if (!template) {
      throw new Error(`Template ${data.templateId} not found`)
    }

    // Create notification item
    const notification: NotificationItem = {
      id: crypto.randomUUID(),
      userId: data.userId,
      templateId: data.templateId,
      title: template.title,
      body: template.body,
      data: data.data,
      channels: data.channels || template.channels,
      priority: data.priority || template.priority,
      status: NotificationStatus.PENDING,
      createdAt: Date.now(),
      deliveredAt: null,
      readAt: null,
      error: null,
    }

    // Add to queue
    await redis.lpush(this.queueKey, JSON.stringify(notification))

    logger.info('Notification queued', {
      id: notification.id,
      userId: notification.userId,
      templateId: notification.templateId,
      channels: notification.channels,
    })

    return notification.id
  }

  /**
   * Process the notification queue
   */
  async processQueue(): Promise<void> {
    while (true) {
      // Move item from queue to processing
      const item = await redis.rpoplpush(this.queueKey, this.processingKey)
      if (!item) break

      const notification = NotificationItemSchema.parse(JSON.parse(item))

      try {
        // Process each channel
        for (const channel of notification.channels) {
          switch (channel) {
            case NotificationChannel.IN_APP:
              await this.deliverInApp(notification)
              break
            case NotificationChannel.PUSH:
              await this.deliverPush(notification)
              break
            case NotificationChannel.EMAIL:
              await this.deliverEmail(notification)
              break
            case NotificationChannel.SMS:
              await this.deliverSMS(notification)
              break
          }
        }

        // Update status
        notification.status = NotificationStatus.DELIVERED
        notification.deliveredAt = Date.now()

        // Store delivered notification
        await redis.hset(
          `notifications:${notification.userId}`,
          notification.id,
          JSON.stringify(notification),
        )

        // Remove from processing queue
        await redis.lrem(this.processingKey, 1, item)

        logger.info('Notification delivered', {
          id: notification.id,
          userId: notification.userId,
          templateId: notification.templateId,
          channels: notification.channels,
        })
      } catch (error) {
        // Update status and error
        notification.status = NotificationStatus.FAILED
        notification.error =
          error instanceof Error ? error.message : String(error)

        // Store failed notification
        await redis.hset(
          `notifications:${notification.userId}`,
          notification.id,
          JSON.stringify(notification),
        )

        // Remove from processing queue
        await redis.lrem(this.processingKey, 1, item)

        logger.error('Notification delivery failed', {
          id: notification.id,
          userId: notification.userId,
          templateId: notification.templateId,
          channels: notification.channels,
          error: notification.error,
        })
      }
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await redis.hget(
      `notifications:${userId}`,
      notificationId,
    )
    if (!notification) {
      throw new Error('Notification not found')
    }

    const parsed = NotificationItemSchema.parse(JSON.parse(notification))
    parsed.status = NotificationStatus.READ
    parsed.readAt = Date.now()

    await redis.hset(
      `notifications:${userId}`,
      notificationId,
      JSON.stringify(parsed),
    )
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<NotificationItem[]> {
    const notifications = await redis.hgetall(`notifications:${userId}`)
    if (!notifications) return []

    return Object.values(notifications)
      .map((n) => NotificationItemSchema.parse(JSON.parse(n)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit)
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await redis.hgetall(`notifications:${userId}`)
    if (!notifications) return 0

    return Object.values(notifications)
      .map((n) => NotificationItemSchema.parse(JSON.parse(n)))
      .filter((n) => n.status !== NotificationStatus.READ).length
  }

  /**
   * Start queue processing
   */
  async startProcessing(interval = 1000): Promise<void> {
    while (true) {
      await this.processQueue()
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  /**
   * Deliver notification via WebSocket
   */
  private async deliverInApp(notification: NotificationItem): Promise<void> {
    const ws = this.wsClients.get(notification.userId)
    if (!ws) return

    ws.send(
      JSON.stringify({
        type: 'notification',
        data: notification,
      }),
    )
  }

  /**
   * Deliver notification via Web Push
   */
  private async deliverPush(notification: NotificationItem): Promise<void> {
    // TODO: Implement push notification delivery
    throw new Error('Push notifications not implemented')
  }

  /**
   * Deliver notification via Email
   */
  private async deliverEmail(notification: NotificationItem): Promise<void> {
    await this.emailService.queueEmail({
      to: notification.userId, // Assuming userId is email address
      templateAlias: notification.templateId,
      templateModel: notification.data,
    })
  }

  /**
   * Deliver notification via SMS
   */
  private async deliverSMS(notification: NotificationItem): Promise<void> {
    // TODO: Implement SMS delivery
    throw new Error('SMS notifications not implemented')
  }
}
