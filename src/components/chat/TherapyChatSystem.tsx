'use client'

import type { Message } from '@/types/chat'
import type { Scenario } from '@/types/scenarios'
import type { MentalHealthAnalysis as MentalHealthChatAnalysis } from '@/lib/chat/mentalHealthChat'
import type { MentalHealthAnalysis as MentalHealthInsightsAnalysis } from '@/lib/chat'
import { clientScenarios } from '@/data/scenarios'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import AnalyticsDashboardReact from './AnalyticsDashboardReact'
import { ChatContainer } from './ChatContainer'
import { MentalHealthInsights } from '@/components/MentalHealthInsights'
import {
  IconChevronDown,
  IconMaximize,
  IconMinimize,
  IconMental,
  IconSettings,
  IconUserCircle,
} from './icons'
import { SecurityBadge } from './SecurityBadge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/Label'

// Extended Message type with mental health analysis
interface ExtendedMessage extends Message {
  mentalHealthAnalysis?: MentalHealthChatAnalysis
}

export default function TherapyChatSystem() {
  // State
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showScenarios, setShowScenarios] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState(clientScenarios[0])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showMentalHealthPanel, setShowMentalHealthPanel] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mentalHealthSettings, setMentalHealthSettings] = useState({
    showPanel: false,
  })

  // Get state from store
  const storeState = useStore()

  // Initialize mental health chat if not already initialized
  useEffect(() => {
    if (!storeState.mentalHealthChat && storeState.fheService) {
      storeState.initializeMentalHealthChat()
    }
  }, [storeState.fheService, storeState.mentalHealthChat])

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Handle scenario change
  const changeScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario)
    setShowScenarios(false)
    // Add system message for new scenario
    setMessages([
      {
        role: 'system',
        content: `New client scenario selected: ${scenario.name}. ${scenario.description}`,
        name: '',
      },
    ])
  }

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!input.trim() || isLoading) {
      return
    }

    const userMessage: ExtendedMessage = {
      role: 'user',
      content: input,
      name: '',
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Process the message with mental health analysis if available
      if (
        storeState.mentalHealthChat &&
        storeState.mentalHealthAnalysisEnabled
      ) {
        const analysisResult = await storeState.mentalHealthChat.processMessage(
          {
            id: `msg_${Date.now()}`,
            conversationId: selectedScenario.id || 'default',
            senderId: 'user',
            content: input,
            timestamp: Date.now(),
          },
        )

        // Update user message with mental health analysis
        if (analysisResult.mentalHealthAnalysis) {
          userMessage.mentalHealthAnalysis = analysisResult.mentalHealthAnalysis
          setMessages((prev) =>
            prev.map((msg) =>
              msg === userMessage
                ? {
                    ...msg,
                    mentalHealthAnalysis: analysisResult.mentalHealthAnalysis,
                  }
                : msg,
            ),
          )
        }
      }

      // Check if intervention is needed based on mental health analysis
      let aiResponse: Message

      if (
        storeState.mentalHealthChat?.needsIntervention(
          selectedScenario.id || 'default',
        )
      ) {
        // Generate therapeutic intervention
        const interventionText =
          await storeState.mentalHealthChat.generateIntervention(
            selectedScenario.id || 'default',
            'client',
          )

        aiResponse = {
          role: 'assistant',
          content: interventionText,
          name: '',
        }
      } else {
        // Get standard AI response
        const response = await storeState.aiService.generateCompletion(
          [...messages, userMessage],
          {
            temperature: 0.7,
            maxTokens: 1000,
            userId: 'user',
            sessionId: selectedScenario.id || 'default',
            // Pass custom data as a string in the model field
            model: JSON.stringify({
              scenario: selectedScenario,
              securityLevel: storeState.securityLevel,
              encryptionEnabled: storeState.encryptionEnabled,
            }),
          },
          'together',
        )

        // Check if response is AICompletionResponse or ReadableStream
        let responseContent = ''
        if ('content' in response) {
          // It's an AICompletionResponse
          responseContent = response.content
        } else {
          // It's a ReadableStream, but we expect a string response
          // In a real implementation, you would read from the stream
          responseContent = 'Response from AI service'
        }

        aiResponse = {
          role: 'assistant',
          content: responseContent,
          name: '',
        }
      }

      setMessages((prev) => [...prev, aiResponse])
    } catch (err) {
      console.error('Error getting AI response:', err)
      setError(
        'An error occurred while getting the AI response. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  // Get the most recent message with mental health analysis
  const getLatestMentalHealthAnalysis = ():
    | MentalHealthChatAnalysis
    | undefined => {
    const messagesWithAnalysis = messages.filter((m) => m.mentalHealthAnalysis)
    return messagesWithAnalysis.length > 0
      ? messagesWithAnalysis[messagesWithAnalysis.length - 1]
          .mentalHealthAnalysis
      : undefined
  }

  // Toggle mental health analysis settings
  const toggleMentalHealthAnalysis = () => {
    storeState.configureMentalHealthAnalysis(
      !storeState.mentalHealthAnalysisEnabled,
      storeState.expertGuidanceEnabled,
    )
  }

  // Toggle expert guidance
  const toggleExpertGuidance = () => {
    storeState.configureMentalHealthAnalysis(
      storeState.mentalHealthAnalysisEnabled,
      !storeState.expertGuidanceEnabled,
    )
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border border-purple-700/30 bg-black bg-opacity-95 p-4',
        'transition-all duration-300 ease-in-out',
        isExpanded ? 'fixed inset-4 z-50' : 'min-h-[600px]',
      )}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-purple-300">
            Therapy Training Session
          </h2>
          <SecurityBadge
            securityLevel={storeState.securityLevel}
            encryptionEnabled={storeState.encryptionEnabled}
            fheInitialized={storeState.fheInitialized}
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="rounded-lg bg-purple-900/30 p-2 text-purple-300 hover:bg-purple-800/30"
            aria-label="Toggle analytics"
          >
            Analytics
          </button>

          <button
            onClick={() => setShowMentalHealthPanel(!showMentalHealthPanel)}
            className={cn(
              'rounded-lg p-2 text-purple-300 hover:bg-purple-800/30',
              showMentalHealthPanel ? 'bg-purple-800/50' : 'bg-purple-900/30',
            )}
            aria-label="Toggle mental health panel"
          >
            <IconMental className="h-5 w-5" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg bg-purple-900/30 p-2 text-purple-300 hover:bg-purple-800/30"
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
          className="flex w-full items-center justify-between rounded-lg border border-purple-700/50 bg-black/50 p-3"
        >
          <span className="flex items-center">
            <IconUserCircle className="mr-2 h-5 w-5 text-purple-500" />
            <span>
              Scenario: <strong>{selectedScenario.name}</strong>
            </span>
          </span>
          <IconChevronDown
            className={cn(
              'h-5 w-5 transition-transform',
              showScenarios && 'rotate-180',
            )}
          />
        </button>

        {showScenarios && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-purple-800 bg-black/80 shadow-lg">
            {clientScenarios.map((scenario) => (
              <button
                key={scenario.name}
                className="block w-full px-4 py-3 text-left hover:bg-purple-900/30 first:rounded-t-lg last:rounded-b-lg"
                onClick={() => changeScenario(scenario)}
              >
                <div className="font-medium">{scenario.name}</div>
                <div className="text-sm text-gray-400">
                  {scenario.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FHE initialization warning */}
      {storeState.encryptionEnabled && !storeState.fheInitialized && (
        <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-900/30 p-3 text-sm text-yellow-400">
          Initializing FHE encryption system... This might take a moment.
        </div>
      )}

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className="mb-4">
          <AnalyticsDashboardReact
            messages={messages}
            securityLevel={storeState.securityLevel}
            encryptionEnabled={storeState.encryptionEnabled}
            scenario={selectedScenario.name}
          />
        </div>
      )}

      {/* Mental Health Analysis Panel */}
      {showMentalHealthPanel && (
        <div className="mb-4 rounded-lg border border-purple-700/50 bg-black/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-purple-300">
              Mental Health Analysis
            </h3>
            <button
              onClick={() =>
                setMentalHealthSettings((prev) => ({
                  ...prev,
                  showPanel: !prev.showPanel,
                }))
              }
              className="rounded-lg bg-purple-900/30 p-2 text-purple-300 hover:bg-purple-800/30"
            >
              <IconSettings className="h-4 w-4" />
            </button>
          </div>

          {mentalHealthSettings.showPanel && (
            <div className="mb-4 space-y-3 p-3 rounded-lg bg-black/70">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableAnalysis" className="text-purple-200">
                  Enable Mental Health Analysis
                </Label>
                <Switch
                  id="enableAnalysis"
                  checked={storeState.mentalHealthAnalysisEnabled}
                  onCheckedChange={toggleMentalHealthAnalysis}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="expertGuidance" className="text-purple-200">
                  Use Expert Guidance
                </Label>
                <Switch
                  id="expertGuidance"
                  checked={storeState.expertGuidanceEnabled}
                  onCheckedChange={toggleExpertGuidance}
                  disabled={!storeState.mentalHealthAnalysisEnabled}
                />
              </div>
            </div>
          )}

          {storeState.mentalHealthAnalysisEnabled ? (
            getLatestMentalHealthAnalysis() ? (
              <MentalHealthInsights
                analysis={getLatestMentalHealthAnalysis()!}
                showCharts={true}
              />
            ) : (
              <div className="text-center py-4 text-purple-300/70 italic">
                No mental health analysis available yet. Send a message to
                generate insights.
              </div>
            )
          ) : (
            <div className="text-center py-4 text-purple-300/70">
              Mental health analysis is currently disabled. Enable it in
              settings to see insights.
            </div>
          )}
        </div>
      )}

      {/* Chat interface */}
      <ChatContainer
        messages={messages}
        onSendMessage={(input) => {
          const fakeEvent = { preventDefault: () => {} } as React.FormEvent
          setInput(input)
          handleSubmit(fakeEvent)
        }}
        isLoading={isLoading}
        error={error || undefined}
        className={isExpanded ? 'h-[calc(100vh-280px)]' : 'h-[500px]'}
        disabled={!storeState.fheInitialized && storeState.encryptionEnabled}
        inputPlaceholder={
          !storeState.fheInitialized && storeState.encryptionEnabled
            ? 'Waiting for encryption system...'
            : undefined
        }
      />
    </div>
  )
}
