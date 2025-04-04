import type { ChatMessage } from '@/types/chat'
import { useCallback, useEffect, useRef, useState } from 'react'

interface WebSocketHookOptions {
  url: string
  sessionId: string
  onMessage?: (message: ChatMessage) => void
  onStatusChange?: (status: string) => void
  onError?: (error: Error) => void
  encrypted?: boolean
}

interface WebSocketMessage {
  type: 'message' | 'status' | 'error'
  data: unknown
  sessionId?: string
  encrypted?: boolean
}

export function useWebSocket({
  url,
  sessionId,
  onMessage,
  onStatusChange,
  onError,
  encrypted = false,
}: WebSocketHookOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setError(null)

        // Send initial status message
        ws.send(
          JSON.stringify({
            type: 'status',
            data: { status: 'connected' },
            sessionId,
            encrypted,
          }),
        )
      }

      ws.onclose = () => {
        setIsConnected(false)
        // Attempt to reconnect after a delay
        setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        const wsError = new Error('WebSocket error')
        setError(wsError)
        if (onError) {
          onError(wsError)
        }
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)

          switch (message.type) {
            case 'message':
              if (onMessage && message.data) {
                onMessage(message.data as ChatMessage)
              }
              break
            case 'status':
              if (onStatusChange && message.data && typeof message.data === 'object' && message.data !== null && 'status' in message.data) {
                onStatusChange(message.data.status as string)
              }
              break
            case 'error':
              {
                const wsError = new Error(
                  message.data && typeof message.data === 'object' && 'message' in message.data 
                    ? String(message.data.message)
                    : 'Unknown error'
                )
                setError(wsError)
                if (onError) {
                  onError(wsError)
                }
              }
                  break
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
          if (onError) {
            onError(error as Error)
          }
        }
      }
    } catch (error) {
      setError(error as Error)
      if (onError) {
        onError(error as Error)
      }
    }
  }, [url, sessionId, onMessage, onStatusChange, onError, encrypted])

  useEffect(() => {
    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const sendMessage = useCallback(
    (message: ChatMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'message',
            data: message,
            sessionId,
            encrypted,
          }),
        )
      } else {
        const error = new Error('WebSocket is not connected')
        setError(error)
        if (onError) {
          onError(error)
        }
      }
    },
    [sessionId, encrypted, onError],
  )

  const sendStatus = useCallback(
    (status: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'status',
            data: { status },
            sessionId,
            encrypted,
          }),
        )
      }
    },
    [sessionId, encrypted],
  )

  return {
    isConnected,
    error,
    sendMessage,
    sendStatus,
  }
}
