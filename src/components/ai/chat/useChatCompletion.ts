import { useState, useCallback } from 'react'
import { type AIMessage, type AIStreamChunk } from '../../../lib/ai'

interface UseChatCompletionOptions {
  apiEndpoint?: string
  model?: string
  initialMessages?: AIMessage[]
  temperature?: number
  maxTokens?: number
  onError?: (error: Error) => void
  onComplete?: (response: string) => void
}

interface UseChatCompletionResult {
  messages: AIMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (message: string) => Promise<void>
  resetChat: () => void
}

/**
 * Custom hook for handling chat completions with the AI API
 */
export function useChatCompletion({
  apiEndpoint = '/api/ai/completion',
  model = 'gpt-4o',
  initialMessages = [],
  temperature = 0.7,
  maxTokens = 1024,
  onError,
  onComplete,
}: UseChatCompletionOptions = {}): UseChatCompletionResult {
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset chat to initial state
  const resetChat = useCallback(() => {
    setMessages(initialMessages)
    setIsLoading(false)
    setError(null)
  }, [initialMessages])

  // Send a message to the AI API
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return

      // Add user message to chat
      const userMessage: AIMessage = {
        role: 'user',
        content: message,
        name: '',
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      try {
        // Prepare request body
        const requestBody = {
          model,
          messages: [...messages, userMessage],
          temperature,
          maxTokens,
          stream: true,
        }

        // Send request to API
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response?.ok) {
          const errorData = await response?.json()
          throw new Error(errorData.error || 'Failed to get AI response')
        }

        // Handle streaming response
        const reader = response?.body?.getReader()
        if (!reader) {
          throw new Error('Response body is null')
        }

        let assistantMessage = ''
        const decoder = new TextDecoder('utf-8')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Decode chunk
          const chunk = decoder.decode(value)
          const lines = chunk
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => line.replace(/^data: /, '').trim())

          for (const line of lines) {
            if (line === '[DONE]') break

            try {
              const data = JSON.parse(line) as AIStreamChunk
              const content = data?.choices?.[0]?.delta?.content

              if (content) {
                assistantMessage += content

                // Update messages with current content
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]

                  if (lastMessage.role === 'assistant') {
                    // Update existing assistant message
                    newMessages[newMessages.length - 1] = {
                      ...lastMessage,
                      content: assistantMessage,
                    }
                  } else {
                    // Add new assistant message
                    newMessages.push({
                      role: 'assistant',
                      content: assistantMessage,
                      name: '',
                    })
                  }

                  return newMessages
                })
              }

              if (data?.choices?.[0]?.finishReason === 'stop') {
                // Streaming is complete
                break
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }

        // Add final assistant message if not already added
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (
            lastMessage.role === 'assistant' &&
            lastMessage.content === assistantMessage
          ) {
            return prev
          }
          return [
            ...prev,
            { role: 'assistant', content: assistantMessage, name: '' },
          ]
        })

        // Call onComplete callback
        if (onComplete) {
          onComplete(assistantMessage)
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred'
        setError(errorMessage)

        // Call onError callback
        if (onError && err instanceof Error) {
          onError(err)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [
      messages,
      isLoading,
      model,
      temperature,
      maxTokens,
      apiEndpoint,
      onError,
      onComplete,
    ]
  )

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat,
  }
}
