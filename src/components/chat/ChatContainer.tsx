import type { Message } from '@/types/chat'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'

interface ChatContainerProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  error?: string
  className?: string
  inputPlaceholder?: string
  disabled?: boolean
}

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Show/hide scroll button based on scroll position
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className={cn('flex h-full flex-col space-y-4', className)}>
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-purple-700/20 bg-black/30 p-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
            <div className="rounded-full bg-purple-900/30 p-4">
              <IconBrain className="h-8 w-8 text-purple-400" />
            </div>
            <div className="max-w-sm space-y-2">
              <h3 className="text-lg font-semibold text-purple-300">
                Start a Conversation
              </h3>
              <p className="text-sm text-gray-400">
                Begin your therapy session by sending a message. The AI will
                respond in a supportive and empathetic manner.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                isError={message.isError}
              />
            ))}

            {isLoading && (
              <ChatMessage
                message={{ role: 'assistant', content: '' }}
                isLoading={true}
              />
            )}

            {error && (
              <ChatMessage
                message={{ role: 'assistant', content: '' }}
                isError={true}
                errorMessage={error}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className={cn(
            'absolute bottom-20 right-4 rounded-full bg-purple-700 p-2',
            'text-white shadow-lg transition-colors hover:bg-purple-600',
          )}
          aria-label="Scroll to bottom"
        >
          <IconChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Input area */}
      <div className="sticky bottom-0 bg-gradient-to-t from-black to-transparent py-4">
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
