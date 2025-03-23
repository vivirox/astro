import { useState, useRef, useEffect } from 'react'
import type { AIMessage } from '../lib/ai/models/types'
import type { AIUsageRecord } from '../lib/ai/models/ai-types'
import type { AIModel } from '../lib/ai/models/types'
import { getAllModels } from '../lib/ai/models/registry'
import { createTogetherAIService } from '../lib/ai/services/together'

// Initialize AI service
const aiService = createTogetherAIService({
  apiKey: import.meta.env.TOGETHER_API_KEY ?? '',
  onUsage: async (usage: AIUsageRecord) => {
    console.log('AI Usage:', usage)
  },
  togetherApiKey: '',
})

// Get available models
const availableModels = getAllModels()

export default function AIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(
    availableModels[0]?.id || ''
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Refs for accessibility features
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input after sending a message
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  // Announce new messages to screen readers
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const role = lastMessage.role === 'user' ? 'You' : 'AI'
      const announcement = `New message from ${role}: ${lastMessage.content}`

      // Create and use a live region for screen reader announcements
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('class', 'sr-only')
      liveRegion.textContent = announcement

      document.body.appendChild(liveRegion)

      // Remove after announcement is made
      setTimeout(() => {
        document.body.removeChild(liveRegion)
      }, 1000)
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!input.trim() || isLoading) return

    // Add user message
    const userMessage: AIMessage = {
      role: 'user',
      content: input,
      name: '',
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Get AI response
      const newMessages = [...messages, userMessage]
      const response = await aiService.generateCompletion(newMessages, {
        model: selectedModel,
        temperature: 0.7,
      })

      // Add assistant message
      const content = response.content || ''

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: content,
        name: '',
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error getting AI response:', error)
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          name: '',
        },
      ])
      setErrorMessage(
        'An error occurred while getting the AI response. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle keyboard navigation in chat messages
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div
      className="max-w-2xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
      role="region"
      aria-label="AI Chat Interface"
    >
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        TogetherAI Chat
      </h2>

      {/* Model selector */}
      <div className="mb-4">
        <label
          htmlFor="model-select"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Select AI Model
        </label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setSelectedModel(e.target.value)
          }
          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          aria-label="AI model selection"
        >
          {availableModels.map((model: AIModel) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chat messages */}
      <div
        ref={messagesContainerRef}
        className="border border-gray-300 dark:border-gray-600 rounded-md p-4 h-96 overflow-y-auto mb-4 bg-gray-50 dark:bg-gray-900"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Chat messages"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {messages.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">
            Start a conversation...
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`mb-3 p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-100 dark:bg-blue-900 ml-auto max-w-[80%] text-gray-900 dark:text-gray-100'
                  : 'bg-gray-100 dark:bg-gray-800 mr-auto max-w-[80%] text-gray-900 dark:text-gray-100'
              }`}
              role={message.role === 'user' ? 'log' : 'log'}
              aria-label={`${message.role === 'user' ? 'Your' : 'AI'} message`}
              tabIndex={0}
            >
              <p className="text-sm font-semibold mb-1">
                {message.role === 'user' ? 'You' : 'AI'}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))
        )}
        {isLoading && (
          <div
            className="flex items-center justify-center mt-4"
            aria-live="assertive"
          >
            <div className="animate-pulse text-gray-500 dark:text-gray-400">
              AI is thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {errorMessage && (
        <div
          className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md"
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Type your message
        </label>
        <input
          ref={inputRef}
          id="chat-input"
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          disabled={isLoading}
          aria-disabled={isLoading}
          aria-label="Chat message input"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:bg-blue-300 dark:disabled:bg-blue-800"
          disabled={isLoading || !input.trim()}
          aria-disabled={isLoading || !input.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </form>

      {/* Keyboard shortcuts help */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          Press{' '}
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
            Esc
          </kbd>{' '}
          to focus on the input field
        </p>
      </div>
    </div>
  )
}
