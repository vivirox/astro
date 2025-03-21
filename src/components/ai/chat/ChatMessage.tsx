import { type AIMessage } from '../../../lib/ai/index'

export interface ChatMessageProps {
  message: AIMessage
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
}

/**
 * Component for displaying a single chat message
 */
export function ChatMessage({
  message,
  isLoading,
  isError,
  errorMessage,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`
          max-w-[80%] rounded-lg p-4
          ${isUser ? 'bg-primary text-primary-foreground' : ''}
          ${isAssistant ? 'bg-secondary text-secondary-foreground' : ''}
          ${isSystem ? 'bg-muted text-muted-foreground italic text-sm' : ''}
          ${isLoading ? 'animate-pulse' : ''}
          ${isError ? 'bg-destructive text-destructive-foreground' : ''}
        `}
      >
        {isError ? (
          <div className="flex flex-col">
            <span className="font-bold">Error</span>
            <span>
              {errorMessage ||
                'An error occurred while generating the response.'}
            </span>
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center mt-2">
            <div className="w-2 h-2 bg-current rounded-full mr-1 animate-bounce"></div>
            <div
              className="w-2 h-2 bg-current rounded-full mr-1 animate-bounce"
              style={{ animationDelay: '0.2s' }}
            ></div>
            <div
              className="w-2 h-2 bg-current rounded-full animate-bounce"
              style={{ animationDelay: '0.4s' }}
            ></div>
          </div>
        )}
      </div>
    </div>
  )
}
