import type { AIMessage } from '../../../lib/ai/index'
import { useEffect, useRef } from 'react'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'

export interface ChatContainerProps {
  messages: AIMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  error?: string
  className?: string
  inputPlaceholder?: string
  disabled?: boolean
}

/**
 * Container component for the chat interface
 */
export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
  error,
  className = '',
  inputPlaceholder,
  disabled = false,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}

            {isLoading && (
              <ChatMessage
                message={{ role: 'assistant', content: '', name: 'assistant' }}
                isLoading={true}
              />
            )}

            {error && (
              <ChatMessage
                message={{ role: 'assistant', content: '', name: 'assistant' }}
                isError={true}
                errorMessage={error}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t">
        <ChatInput
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          placeholder={inputPlaceholder}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
