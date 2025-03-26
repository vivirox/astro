'use client'

import type { Message } from '@/types/chat'
import { clientScenarios } from '@/data/scenarios'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useChat } from '@/hooks/useChat'
import { useSecurity } from '@/hooks/useSecurity'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useEffect, useRef, useState } from 'react'
import { AnalyticsDashboard } from './AnalyticsDashboard'
import { ChatInput } from './ChatInput'
import { ChatMessage } from './ChatMessage'
import { ScenarioSelector } from './ScenarioSelector'
import { SecurityBadge } from './SecurityBadge'

export function TherapyChatClient() {
  // State
  const [selectedScenario, setSelectedScenario] = useState(clientScenarios[0])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showScenarios, setShowScenarios] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Hooks
  const { securityLevel, encryptionEnabled, fheInitialized } = useSecurity()
  const analytics = useAnalytics()

  // WebSocket integration
  const { isConnected, sendMessage } = useWebSocket({
    url: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    sessionId,
    onMessage: (message) => {
      if (message.role === 'assistant') {
        setMessages((prev) => [...prev, message])
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error)
      analytics.trackEvent({
        type: 'websocket_error',
        properties: {
          error: error.message,
          sessionId,
        },
      })
    },
    encrypted: encryptionEnabled,
  })

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    initialMessages: [
      {
        id: '1',
        role: 'system',
        content: `You are a simulated therapy client with the following characteristics: ${selectedScenario.name}. ${selectedScenario.description}. The user is a therapist in training. Respond as this client would, with appropriate challenges and resistance. Keep responses under 150 words.`,
      },
    ],
    api: '/api/ai/therapy-chat',
    body: {
      scenario: selectedScenario.name.toLowerCase().replace(' ', '-'),
      securityLevel,
      encryptionEnabled,
      sessionId,
      options: {
        enablePIIDetection: true,
        enableToxicityFiltering: securityLevel !== 'standard',
        retainEncryptedAnalytics: securityLevel === 'maximum',
        processingLocation: 'client-side',
      },
    },
  })

  // Effects
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Handlers
  const handleScenarioChange = (scenario: (typeof clientScenarios)[0]) => {
    setSelectedScenario(scenario)
    setMessages([])
    setShowScenarios(false)

    // Add system message for new scenario
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `You are a simulated therapy client with the following characteristics: ${scenario.name}. ${scenario.description}. The user is a therapist in training. Respond as this client would, with appropriate challenges and resistance. Keep responses under 150 words.`,
    }
    setMessages([systemMessage])
  }

  const handleSecureSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      encrypted: encryptionEnabled,
    }

    // Add message to local state
    setMessages((prev) => [...prev, userMessage])

    // Send via WebSocket if connected
    if (isConnected) {
      sendMessage(userMessage)
    }

    // Track analytics
    analytics.trackEvent({
      type: 'therapy_session',
      properties: {
        scenario: selectedScenario.name,
        messageCount: messages.length,
        securityLevel,
        websocketConnected: isConnected,
      },
    })

    // Call API
    await handleSubmit(e)
  }

  return (
    <div className={`${isExpanded ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 rounded-t-lg p-3">
        <h1 className="text-xl font-bold">Gradiant Therapy Chat</h1>
        <div className="flex items-center space-x-2">
          <SecurityBadge />
          {isConnected && (
            <span className="px-2 py-1 text-xs bg-green-800 text-green-200 rounded">
              Live
            </span>
          )}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-2 py-1 text-sm bg-purple-700 rounded hover:bg-purple-600"
          >
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 text-sm bg-purple-700 rounded hover:bg-purple-600"
          >
            {isExpanded ? 'Minimize' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Scenario selector */}
      <ScenarioSelector
        scenarios={clientScenarios}
        selectedScenario={selectedScenario}
        showScenarios={showScenarios}
        setShowScenarios={setShowScenarios}
        onSelect={handleScenarioChange}
      />

      {/* FHE initialization warning */}
      {encryptionEnabled && !fheInitialized && (
        <div className="mb-4 p-2 bg-yellow-800 bg-opacity-30 border border-yellow-700 rounded text-yellow-400 text-sm">
          Initializing FHE encryption system... This might take a moment.
        </div>
      )}

      {/* Analytics dashboard */}
      {showAnalytics && (
        <div className="mb-4">
          <AnalyticsDashboard
            messages={messages}
            securityLevel={securityLevel}
            encryptionEnabled={encryptionEnabled}
            scenario={selectedScenario.name}
          />
        </div>
      )}

      {/* Chat container */}
      <div
        ref={chatContainerRef}
        className={`overflow-y-auto ${
          isExpanded ? 'h-[calc(100vh-200px)]' : 'h-[65vh]'
        } border border-purple-800 rounded-lg bg-black bg-opacity-40 p-4 mb-4`}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-xl font-medium mb-2">Begin Your Session</p>
            <p className="text-center max-w-md">
              Start therapy training with our AI client simulation.
              {encryptionEnabled &&
                (securityLevel === 'maximum'
                  ? ' Messages are protected with FHE for maximum security.'
                  : ' Messages are encrypted for privacy.')}
            </p>
          </div>
        ) : (
          <>
            {messages
              .filter((m) => m.role !== 'system')
              .map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  scenario={selectedScenario}
                />
              ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSecureSubmit}
        isLoading={isLoading}
        disabled={!fheInitialized && encryptionEnabled}
      />
    </div>
  )
}
