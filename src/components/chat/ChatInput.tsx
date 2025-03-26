import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'
import { IconSend } from './icons'

interface ChatInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  disabled?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative flex items-end space-x-2 rounded-lg border border-purple-700/50 bg-black/50 p-2"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? 'AI is responding...' : 'Type your message...'}
        disabled={isLoading || disabled}
        className={cn(
          'flex-1 resize-none bg-transparent p-2 placeholder-gray-500',
          'focus:outline-none focus:ring-0',
          'min-h-[40px] max-h-[200px]',
          'text-white scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent',
        )}
        rows={1}
      />
      <button
        type="submit"
        disabled={isLoading || disabled || !value.trim()}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          'bg-purple-700 text-white transition-colors',
          'hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <IconSend
          className={cn(
            'h-5 w-5 transition-transform',
            isLoading && 'animate-pulse',
          )}
        />
      </button>
    </form>
  )
}
