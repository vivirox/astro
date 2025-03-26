import type { NotificationItem } from '@/lib/services/notification/NotificationService'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { useWebSocket } from '@/hooks/useWebSocket'
import { NotificationStatus } from '@/lib/services/notification/NotificationService'
import { cn } from '@/lib/utils'
import { Bell, Check, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const { sendMessage, lastMessage } = useWebSocket()

  useEffect(() => {
    // Request initial notifications
    sendMessage({
      type: 'get_notifications',
      limit: 20,
      offset: 0,
    })
  }, [sendMessage])

  useEffect(() => {
    if (!lastMessage) return

    const data = JSON.parse(lastMessage.data)

    switch (data.type) {
      case 'notifications':
        setNotifications(data.data)
        break
      case 'notification':
        setNotifications((prev) => [data.data, ...prev])
        setUnreadCount((prev) => prev + 1)
        break
      case 'unread_count':
        setUnreadCount(data.data)
        break
    }
  }, [lastMessage])

  const handleMarkAsRead = async (notificationId: string) => {
    sendMessage({
      type: 'mark_read',
      notificationId,
    })

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, status: NotificationStatus.READ, readAt: Date.now() }
          : n,
      ),
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleDismiss = async (notificationId: string) => {
    sendMessage({
      type: 'dismiss',
      notificationId,
    })

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    if (
      notifications.find((n) => n.id === notificationId)?.status ===
      NotificationStatus.PENDING
    ) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 z-50 w-96 shadow-lg">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-4 p-4 transition-colors',
                      notification.status === NotificationStatus.PENDING &&
                        'bg-muted/50',
                    )}
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {notification.body}
                      </p>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {notification.status === NotificationStatus.PENDING && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDismiss(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      )}
    </div>
  )
}
