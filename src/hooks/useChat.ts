import type { ChatOptions, Message } from '@/types/chat'
import type { ChangeEvent } from 'react'
import { useState } from 'react'

export function useChat(options: ChatOptions) {
  const {
    initialMessages = [],
    api = '/api/chat',
    body = {},
    onResponse,
    onError,
  } = options

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setInput('')

    try {
      // Prepare the request
      const requestBody = {
        messages: messages.concat(userMessage),
        ...body,
      }

      // Call the API
      const response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (onResponse) {
        onResponse(response)
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseData = await response.json()

      // Add assistant message from response
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          responseData.text ||
          responseData.content ||
          responseData.message ||
          'No response content',
        encrypted: responseData.encrypted,
        verified: responseData.verified,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error in chat:', error)

      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${(error as Error).message}`,
        isError: true,
      }

      setMessages((prev) => [...prev, errorMessage])

      if (onError) {
        onError(error as Error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  }
}
