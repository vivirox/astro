import type { MentalHealthAnalysis } from '@/lib/chat/mentalHealthChat'
import type { Message } from '@/types/chat'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { markdownToHtml } from '@/lib/markdown'
import { formatTimestamp } from '@/lib/dates'

interface ExtendedMessage extends Message {
  mentalHealthAnalysis?: MentalHealthAnalysis
}

interface ChatMessageProps {
  message: ExtendedMessage
  timestamp?: string
  className?: string
  isLatest?: boolean
  isTyping?: boolean
}

export function ChatMessage({
  message,
  timestamp,
  className,
  isLatest = false,
  isTyping = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isBotMessage = message.role === 'assistant'
  const isSystemMessage = message.role === 'system'

  // Format category name
  const formatCategoryName = (category: string): string => {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Get color for category badge
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      depression: 'bg-blue-500',
      anxiety: 'bg-yellow-500',
      ptsd: 'bg-red-500',
      bipolar_disorder: 'bg-purple-500',
      ocd: 'bg-green-500',
      eating_disorder: 'bg-pink-500',
      social_anxiety: 'bg-indigo-500',
      panic_disorder: 'bg-orange-500',
      suicidality: 'bg-red-700',
      none: 'bg-gray-500',
    }
    return colors[category] || 'bg-gray-500'
  }

  const hasAnalysis =
    message.mentalHealthAnalysis &&
    message.mentalHealthAnalysis.hasMentalHealthIssue

  return (
    <div
      className={cn(
        'flex w-full items-start',
        isUser ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      <div
        className={cn(
          'relative mb-6 max-w-[80%] rounded-lg p-4',
          isUser
            ? 'bg-purple-800/80 text-white'
            : isBotMessage
              ? 'bg-gray-800/60 text-white'
              : 'bg-gray-950/60 text-gray-400 italic',
          isTyping && 'animate-pulse',
        )}
      >
        {/* Role badge */}
        <div className="absolute -top-3 left-3">
          <div
            className={cn(
              'rounded-full px-2 py-1 text-xs',
              isUser
                ? 'bg-purple-900 text-purple-300'
                : isBotMessage
                  ? 'bg-gray-900 text-gray-300'
                  : 'bg-black/80 text-gray-500',
            )}
          >
            {isUser ? 'You' : isBotMessage ? 'AI' : 'System'}
          </div>
        </div>

        {/* Mental health badge (if applicable) */}
        {hasAnalysis && (
          <div className="absolute -top-3 right-3">
            <Badge
              className={`${getCategoryColor(message.mentalHealthAnalysis!.category)} text-white text-xs`}
            >
              {formatCategoryName(message.mentalHealthAnalysis!.category)}
            </Badge>
          </div>
        )}

        <div className="mt-1">
          {/* For system messages, display as-is */}
          {isSystemMessage ? (
            <div className="text-sm">{message.content}</div>
          ) : (
            /* For user and bot messages, convert markdown to HTML */
            <div
              className="prose prose-sm dark:prose-invert prose-headings:mb-2 prose-p:my-1 max-w-none"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(message.content),
              }}
            />
          )}
        </div>

        {timestamp && (
          <div className="mt-2 text-right text-xs opacity-60">
            {formatTimestamp(timestamp)}
          </div>
        )}
      </div>
    </div>
  )
}
