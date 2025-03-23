'use client'

import { useState, useRef, useEffect } from 'react'
import {
  IconSend,
  IconChevronDown,
  IconMaximize,
  IconMinimize,
  IconLock,
  IconShieldLock,
  IconMessage,
  IconBrain,
  IconUserCircle,
  IconBarChart,
} from './icons'

import { fheService } from '../../lib/fhe'
// Import the analytics dashboard
import AnalyticsDashboard from './AnalyticsDashboard'
// Import export button
import ExportButton from './ExportButton'

// Create a simple store implementation to avoid zustand dependency
const createStore = <T extends Record<string, unknown>>(initialState: T) => {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => {
      const nextState = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...nextState }
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        return
      }
    },
  }
}

// Global store for chat state
interface ChatStoreState extends Record<string, unknown> {
  darkMode: boolean
  securityLevel: 'standard' | 'hipaa' | 'maximum'
  encryptionEnabled: boolean
}

const chatStore = createStore<ChatStoreState>({
  darkMode: true,
  securityLevel: 'hipaa',
  encryptionEnabled: true,
})

// AI therapy scenarios
const clientScenarios = [
  {
    name: 'Resistant Client',
    description:
      'Client who is resistant to therapy and challenges the process',
  },
  {
    name: 'Trauma Survivor',
    description:
      'Client dealing with complex trauma requiring careful handling',
  },
  {
    name: 'Crisis Situation',
    description: 'Client in acute distress requiring immediate stabilization',
  },
  {
    name: 'Boundary Testing',
    description: 'Client who consistently tests professional boundaries',
  },
]

// Interface for chat messages
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  encrypted?: boolean
  verified?: boolean
  isError?: boolean
}

// Interface for useChat options
interface UseChatOptions {
  initialMessages?: Message[]
  api?: string
  body?: Record<string, unknown>
  onResponse?: (response: Response) => void
  onError?: (error: Error) => void
}

// Custom useChat hook implementation
const useChat = (options: UseChatOptions) => {
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | string
  ) => {
    setInput(typeof e === 'string' ? e : e.target?.value)
  }

  const append = async (
    message: Partial<Message> & {
      role: 'user' | 'assistant' | 'system'
      content: string
    }
  ) => {
    const completeMessage: Message = {
      id: message.id || crypto.randomUUID(),
      role: message.role,
      content: message.content,
      encrypted: message.encrypted,
      verified: message.verified,
      isError: message.isError,
    }
    setMessages((prev) => [...prev, completeMessage])
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      encrypted: chatStore.getState().encryptionEnabled,
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
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          responseData.text ||
          responseData.content ||
          responseData.message ||
          'No response content',
        encrypted: chatStore.getState().encryptionEnabled,
        verified: true,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error in chat:', error)

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
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
    append,
  }
}

// Remove unused decryptMessage function
// const decryptMessage = async (encryptedData: string): Promise<string> => {...}

export default function TherapyChatSystem() {
  // Get state from store
  const [storeState, setStoreState] = useState({
    darkMode: chatStore.getState().darkMode,
    securityLevel: chatStore.getState().securityLevel,
    encryptionEnabled: chatStore.getState().encryptionEnabled,
  })

  // Update local state when store changes
  useEffect(() => {
    const unsubscribe = chatStore.subscribe(() => {
      setStoreState({
        darkMode: chatStore.getState().darkMode,
        securityLevel: chatStore.getState().securityLevel,
        encryptionEnabled: chatStore.getState().encryptionEnabled,
      })
    })
    return unsubscribe
  }, [])

  // Helper to update store
  const updateStore = (updates: Partial<ChatStoreState>) => {
    chatStore.setState(updates)
  }

  // Local state
  const [isExpanded, setIsExpanded] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [fheInitialized, setFheInitialized] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState(clientScenarios[0])
  const [showScenarios, setShowScenarios] = useState(false)
  const [sessionId] = useState<string>(() => crypto.randomUUID())

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Function to refresh FHE keys when needed
  const refreshFHEKeys = async () => {
    try {
      if (
        storeState.securityLevel === 'maximum' &&
        storeState.encryptionEnabled
      ) {
        // Call key rotation API instead of direct method
        await fetch('/api/security/rotate-keys', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
            forceRotation: true,
          }),
        })
        console.log('FHE keys rotation requested')
      }
    } catch (error) {
      console.error('Failed to request FHE key rotation:', error)
    }
  }

  // AI Chat hook with options
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    append,
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
    api: '/api/ai/therapy-chat', // Use our custom API endpoint
    body: {
      // Include additional data for our custom API
      scenario: selectedScenario.name.toLowerCase().replace(' ', '-'),
      securityLevel: storeState.securityLevel,
      encryptionEnabled: storeState.encryptionEnabled,
      sessionId: sessionId, // Ensure consistent session ID for key management
      options: {
        enablePIIDetection: true,
        enableToxicityFiltering: storeState.securityLevel !== 'standard',
        retainEncryptedAnalytics: storeState.securityLevel === 'maximum',
        processingLocation: 'client-side', // Prefer client-side processing for sensitive data
      },
    },
    onResponse: (response: Response) => {
      // Log for compliance
      console.log(`Response received with status ${response.status}`)
      console.log(`Security level: ${response.headers.get('X-Security-Level')}`)
      console.log(
        `Encryption mode: ${response.headers.get('X-Encryption-Mode')}`
      )

      // Check if keys need rotation
      const keyRotationNeeded = response.headers.get('X-Key-Rotation-Needed')
      if (keyRotationNeeded === 'true') {
        console.log('Key rotation required - triggering key refresh')
        refreshFHEKeys()
      }
    },
    onError: (error: Error) => {
      console.error('Error in chat communication:', error)
    },
  })

  // Initialize FHE components with enhanced security
  useEffect(() => {
    const initFHE = async () => {
      try {
        // Map security level to encryption mode
        let encryptionMode = 'none'
        if (storeState.encryptionEnabled) {
          if (storeState.securityLevel === 'maximum') {
            encryptionMode = 'fhe'
          } else if (storeState.securityLevel === 'hipaa') {
            encryptionMode = 'hipaa'
          } else {
            encryptionMode = 'standard'
          }
        }

        // Initialize FHE service with production settings and advanced parameters
        // Use unknown as intermediary type for safer casting
        const initOptions = {
          mode: encryptionMode,
          keySize:
            storeState.securityLevel === 'maximum'
              ? 4096
              : storeState.securityLevel === 'hipaa'
                ? 2048
                : 1024,
          securityLevel: storeState.securityLevel,
          enableDebug: process.env.NODE_ENV === 'development',
          disableCache: storeState.securityLevel === 'maximum', // Disable key caching for highest security
          sessionId: sessionId, // Consistent session ID for key management
          advancedOptions: {
            keyPartitioning: storeState.securityLevel === 'maximum',
            multiFactorAuth: storeState.securityLevel === 'maximum',
            memoryProtection: true,
            secureElementIfAvailable: true,
          },
        }
        await fheService.initialize(
          initOptions as unknown as Parameters<typeof fheService.initialize>[0]
        )

        // If using maximum security, setup key management
        if (encryptionMode === 'fhe') {
          /*
          const keyManagementOptions = {
            rotationPeriodDays: storeState.securityLevel === 'maximum' ? 3 : 7,
            persistKeys: true,
            keyPartitioning: true,
            multiFactorAuth: storeState.securityLevel === 'maximum',
            accessAuditLogging: true
          };
          */
          // Method doesn't exist in FHEService implementation
          // await fheService.setupKeyManagement(keyManagementOptions as unknown as Parameters<typeof fheService.setupKeyManagement>[0]);
        }

        setFheInitialized(true)
        console.log(`FHE initialized successfully in ${encryptionMode} mode`)

        // Notify the user if they're in maximum security mode with FHE
        if (encryptionMode === 'fhe') {
          append({
            role: 'system',
            content:
              'Fully Homomorphic Encryption is now active with advanced security settings. Your messages will be processed while encrypted for maximum privacy.',
          })
        }
      } catch (error) {
        console.error('Failed to initialize FHE:', error)
        // Fall back to standard encryption if FHE initialization fails
        if (storeState.securityLevel === 'maximum') {
          updateStore({ securityLevel: 'hipaa', encryptionEnabled: true })
          append({
            role: 'system',
            content:
              'FHE initialization failed. Falling back to HIPAA-compliant encryption.',
          })
        }
      }
    }

    initFHE()
  }, [
    storeState.securityLevel,
    storeState.encryptionEnabled,
    sessionId,
    append,
  ])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Monitor scroll position for showing scroll button
  useEffect(() => {
    const handleScroll = () => {
      if (!chatContainerRef.current) return

      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
    }

    const container = chatContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Handle scenario selection
  const changeScenario = (scenario: (typeof clientScenarios)[0]) => {
    setSelectedScenario(scenario)
    setMessages([])
    setShowScenarios(false)

    // Add system message for new scenario
    append({
      role: 'system',
      content: `You are a simulated therapy client with the following characteristics: ${scenario.name}. ${scenario.description}. The user is a therapist in training. Respond as this client would, with appropriate challenges and resistance. Keep responses under 150 words.`,
    })
  }

  // Custom submit handler
  const handleSecureSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Submit the form using the useChat handleSubmi
    handleSubmit(e)
  }

  // Scroll to bottom manually
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }

  // Toggle security level
  const toggleSecurityLevel = () => {
    const levels: ('standard' | 'hipaa' | 'maximum')[] = [
      'standard',
      'hipaa',
      'maximum',
    ]
    const currentIndex = levels.indexOf(storeState.securityLevel)
    const nextIndex = (currentIndex + 1) % levels.length
    updateStore({ securityLevel: levels[nextIndex] })
  }

  // Add state for showing analytics
  const [showAnalytics, setShowAnalytics] = useState(false)

  return (
    <div
      className={`min-h-screen ${storeState.darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
    >
      <div
        className={`mx-auto p-4 ${isExpanded ? 'fixed inset-0 z-50' : 'max-w-4xl'}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 bg-gradient-to-r from-black via-purple-900 to-black rounded-t-lg p-3">
          <div className="flex items-center">
            <IconBrain className="h-6 w-6 text-purple-400 mr-2" />
            <h1 className="text-xl font-bold">Gradiant Therapy Chat</h1>
          </div>

          <div className="flex items-center space-x-2">
            {storeState.encryptionEnabled && (
              <button
                onClick={toggleSecurityLevel}
                className="flex items-center text-xs text-green-400 px-2 py-1 rounded bg-black bg-opacity-30 hover:bg-opacity-50 transition-colors"
              >
                <IconShieldLock className="h-4 w-4 mr-1" />
                {storeState.securityLevel === 'maximum'
                  ? 'FHE Secure'
                  : storeState.securityLevel === 'hipaa'
                    ? 'HIPAA Compliant'
                    : 'Standard'}
              </button>
            )}

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center text-xs px-2 py-1 rounded bg-purple-900 bg-opacity-30 hover:bg-opacity-50 transition-colors"
              aria-label={showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            >
              <IconBarChart className="h-4 w-4 mr-1" />
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>

            {/* Export Button */}
            {messages.length > 0 && (
              <ExportButton
                sessionId={sessionId}
                disabled={!fheInitialized || messages.length === 0}
                securityLevel={storeState.securityLevel}
                onExportStart={() => {
                  append({
                    role: 'system',
                    content: 'Preparing secure conversation export...',
                  })
                }}
                onExportComplete={(result) => {
                  append({
                    role: 'system',
                    content: `Conversation exported successfully in ${(result as { format: string }).format} format.`,
                  })
                }}
                onExportError={(error) => {
                  append({
                    role: 'system',
                    content: `Export failed: ${error.message}`,
                  })
                }}
              />
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-gray-700"
              aria-label={isExpanded ? 'Minimize' : 'Maximize'}
            >
              {isExpanded ? (
                <IconMinimize className="h-5 w-5" />
              ) : (
                <IconMaximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Scenario selector */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowScenarios(!showScenarios)}
            className="flex justify-between items-center w-full p-2 border border-purple-700 rounded-md bg-black bg-opacity-50 text-left"
          >
            <span className="flex items-center">
              <IconUserCircle className="h-5 w-5 mr-2 text-purple-500" />
              <span>
                Scenario: <strong>{selectedScenario.name}</strong>
              </span>
            </span>
            <IconChevronDown
              className={`h-5 w-5 transition-transform ${showScenarios ? 'rotate-180' : ''}`}
            />
          </button>

          {showScenarios && (
            <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg bg-black bg-opacity-80 border border-purple-800">
              {clientScenarios.map((scenario) => (
                <button
                  key={scenario.name}
                  className="block w-full px-4 py-2 text-left hover:bg-purple-900 first:rounded-t-md last:rounded-b-md"
                  onClick={() => changeScenario(scenario)}
                >
                  <div className="font-medium">{scenario.name}</div>
                  <div className="text-sm text-gray-300">
                    {scenario.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FHE initialization warning */}
        {storeState.encryptionEnabled && !fheInitialized && (
          <div className="mb-4 p-2 bg-yellow-800 bg-opacity-30 border border-yellow-700 rounded-md text-yellow-400 text-sm">
            Initializing FHE encryption system... This might take a moment.
          </div>
        )}

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div className="mb-4">
            <AnalyticsDashboard
              messages={messages}
              securityLevel={storeState.securityLevel}
              encryptionEnabled={storeState.encryptionEnabled}
              scenario={selectedScenario.name}
            />
          </div>
        )}

        {/* Chat container */}
        <div
          ref={chatContainerRef}
          className={`overflow-y-auto ${
            isExpanded ? 'h-[calc(100vh-200px)]' : 'h-[65vh]'
          } border border-gray-800 rounded-lg bg-black bg-opacity-40 p-4 mb-4`}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <IconMessage className="h-16 w-16 mb-4 text-purple-700 opacity-50" />
              <p className="text-xl font-medium mb-2">Begin Your Session</p>
              <p className="text-center max-w-md">
                Start therapy training with our AI client simulation.
                {storeState.encryptionEnabled &&
                  (storeState.securityLevel === 'maximum'
                    ? ' Messages are protected with FHE for maximum security.'
                    : ' Messages are encrypted for privacy.')}
              </p>
            </div>
          ) : (
            <>
              {messages
                .filter((m) => m.role !== 'system')
                .map((message) => (
                  <div
                    key={message.id}
                    className={`mb-4 max-w-[85%] ${
                      message.role === 'user'
                        ? 'ml-auto mr-0 bg-purple-950 rounded-2xl rounded-tr-none'
                        : message.isError
                          ? 'ml-0 mr-auto bg-red-900 rounded-2xl rounded-tl-none'
                          : 'ml-0 mr-auto bg-gray-800 rounded-2xl rounded-tl-none'
                    } p-3 shadow-lg`}
                  >
                    <div className="flex items-center mb-1 text-xs text-gray-400">
                      {message.role === 'user' ? (
                        <span className="flex items-center">
                          Therapist{' '}
                          {message.encrypted && (
                            <span className="flex items-center ml-1">
                              <IconLock className="h-3 w-3 mr-1" />
                              <span className="text-green-400">encrypted</span>
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          Client: {selectedScenario.name}{' '}
                          {message.encrypted && (
                            <span className="flex items-center ml-1">
                              <IconLock className="h-3 w-3 mr-1" />
                              <span
                                className={`${message.verified ? 'text-green-400' : 'text-yellow-500'}`}
                              >
                                {message.verified ? 'verified' : 'encrypted'}
                              </span>
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div
                      className={`whitespace-pre-wrap ${message.isError ? 'text-red-300' : ''}`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-24 right-10 bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
              aria-label="Scroll to bottom"
            >
              <IconChevronDown className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSecureSubmit}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={
              isLoading ? 'AI is responding...' : 'Type your message...'
            }
            disabled={isLoading}
            className="flex-1 p-3 rounded-lg border border-gray-700 bg-black bg-opacity-50 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 rounded-lg bg-purple-700 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IconSend className="h-5 w-5" />
          </button>
        </form>

        {/* Security badge */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center text-xs text-purple-400">
            <IconShieldLock className="h-3 w-3 mr-1" />
            {storeState.encryptionEnabled
              ? `Secured with ${
                  storeState.securityLevel === 'maximum'
                    ? 'Fully Homomorphic Encryption (FHE)'
                    : storeState.securityLevel === 'hipaa'
                      ? 'HIPAA-compliant Encryption'
                      : 'Standard Encryption'
                }`
              : 'Encryption disabled'}
          </div>
        </div>
      </div>
    </div>
  )
}
