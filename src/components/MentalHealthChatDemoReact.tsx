'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/Label'
import {
  MentalHealthInsights,
  MentalHealthHistoryChart,
} from '@/components/MentalHealthInsights'
import { getLogger } from '@/lib/utils/logger'
import { fheService as _fheService } from '@/lib/fhe'
import type { MentalHealthAnalysis } from '@/lib/chat'
import { createMentalHealthChat } from '@/lib/chat'

const logger = getLogger('MentalHealthChatDemo')

// Mock implementation for demo
const mockFHEService = {
  encrypt: async (data: string) => data,
  decrypt: async (data: string) => data,
  encryptText: async (text: string) => text,
  decryptText: async (text: string) => text,
  generateHash: async (data: string) => `hash_${data.substring(0, 10)}`,
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  mentalHealthAnalysis?: MentalHealthAnalysis
}

interface MentalHealthChatDemoReactProps {
  initialTab?: string
  showSettingsPanel?: boolean
  showAnalysisPanel?: boolean
}

/**
 * React component for the MentalLLaMA chat integration
 */
export default function MentalHealthChatDemoReact({
  initialTab = 'chat',
  showSettingsPanel = true,
  showAnalysisPanel = true,
}: MentalHealthChatDemoReactProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm here to chat. How are you feeling today?",
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [mentalHealthChat, setMentalHealthChat] = useState<ReturnType<
    typeof createMentalHealthChat
  > | null>(null)
  const [settings, setSettings] = useState({
    enableAnalysis: true,
    useExpertGuidance: true,
    showAnalysisPanel: showAnalysisPanel,
  })
  const [activeTab, setActiveTab] = useState(initialTab)

  // Initialize the MentalHealthChat service
  useEffect(() => {
    const chat = createMentalHealthChat(mockFHEService, {
      enableAnalysis: settings.enableAnalysis,
      useExpertGuidance: settings.useExpertGuidance,
      triggerInterventionThreshold: 0.7,
      analysisMinimumLength: 15,
    })

    setMentalHealthChat(chat)

    return () => {
      // Clean up if needed
    }
  }, [settings.enableAnalysis, settings.useExpertGuidance])

  // Get all analyses from the message history
  const getAnalysisHistory = (): MentalHealthAnalysis[] => {
    return messages
      .filter((m) => m.mentalHealthAnalysis)
      .map((m) => m.mentalHealthAnalysis!)
  }

  // Process a new user message
  const handleSendMessage = async () => {
    if (!input.trim() || !mentalHealthChat) return

    setProcessing(true)

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: input,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')

      // Process message with MentalHealthChat
      const processedMessage = await mentalHealthChat.processMessage({
        id: userMessage.id,
        conversationId: 'demo-conversation',
        senderId: 'user',
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      })

      // Update user message with analysis
      if (processedMessage.mentalHealthAnalysis) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id
              ? {
                  ...m,
                  mentalHealthAnalysis: processedMessage.mentalHealthAnalysis,
                }
              : m,
          ),
        )
      }

      // Generate assistant response
      let responseContent = 'I understand. Can you tell me more about that?'

      // If intervention is needed, generate therapeutic response
      if (mentalHealthChat.needsIntervention('demo-conversation')) {
        responseContent = await mentalHealthChat.generateIntervention(
          'demo-conversation',
          'user',
        )
      }

      // Add assistant response
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setProcessing(false)
      }, 1000)
    } catch (error) {
      logger.error('Error processing message', { error })
      setProcessing(false)
    }
  }

  // Toggle settings
  const handleToggleSetting = (setting: keyof typeof settings) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [setting]: !prev[setting] }

      // Update the MentalHealthChat service if needed
      if (
        mentalHealthChat &&
        (setting === 'enableAnalysis' || setting === 'useExpertGuidance')
      ) {
        mentalHealthChat.configure({
          enableAnalysis: newSettings.enableAnalysis,
          useExpertGuidance: newSettings.useExpertGuidance,
        })
      }

      return newSettings
    })
  }

  // Request a therapeutic intervention
  const handleRequestIntervention = async (
    _messageWithAnalysis: ChatMessage,
  ) => {
    if (!mentalHealthChat) return

    setProcessing(true)

    try {
      const intervention = await mentalHealthChat.generateIntervention(
        'demo-conversation',
        'user',
      )

      const assistantMessage: ChatMessage = {
        id: `intervention_${Date.now()}`,
        role: 'assistant',
        content: intervention,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      logger.error('Error generating intervention', { error })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full">
      <div
        className={`flex-1 ${settings.showAnalysisPanel ? 'md:max-w-[65%]' : 'w-full'}`}
      >
        <Card className="h-[600px] flex flex-col">
          <CardContent className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              {processing && (
                <div className="flex justify-start">
                  <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted">
                    <p>...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={processing}
              />
              <Button onClick={handleSendMessage} disabled={processing}>
                Send
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Panel */}
      {settings.showAnalysisPanel && (
        <div className="flex-1">
          <Tabs
            defaultValue={activeTab}
            onValueChange={setActiveTab}
            className="h-[600px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              {showSettingsPanel && (
                <TabsTrigger value="settings">Settings</TabsTrigger>
              )}
            </TabsList>
            <TabsContent
              value="analysis"
              className="h-[calc(100%-45px)] overflow-hidden"
            >
              <Card className="h-full">
                <CardContent className="p-4 h-full overflow-auto">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Mental Health Insights
                    </h3>
                    <MentalHealthInsights
                      analyses={getAnalysisHistory()}
                      requestIntervention={handleRequestIntervention}
                    />
                    <div className="h-[200px] mt-6">
                      <h3 className="text-lg font-medium mb-2">
                        Pattern Analysis
                      </h3>
                      <MentalHealthHistoryChart
                        analyses={getAnalysisHistory()}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {showSettingsPanel && (
              <TabsContent
                value="settings"
                className="h-[calc(100%-45px)] overflow-hidden"
              >
                <Card className="h-full">
                  <CardContent className="p-4 h-full overflow-auto">
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium">Chat Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="enable-analysis"
                              className="text-base font-medium"
                            >
                              Enable Analysis
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Analyze messages for mental health indicators
                            </p>
                          </div>
                          <Switch
                            id="enable-analysis"
                            checked={settings.enableAnalysis}
                            onCheckedChange={() =>
                              handleToggleSetting('enableAnalysis')
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="expert-guidance"
                              className="text-base font-medium"
                            >
                              Expert Guidance
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Use clinician-validated interpretation
                            </p>
                          </div>
                          <Switch
                            id="expert-guidance"
                            checked={settings.useExpertGuidance}
                            onCheckedChange={() =>
                              handleToggleSetting('useExpertGuidance')
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label
                              htmlFor="show-analysis"
                              className="text-base font-medium"
                            >
                              Show Analysis Panel
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Display the analysis sidebar
                            </p>
                          </div>
                          <Switch
                            id="show-analysis"
                            checked={settings.showAnalysisPanel}
                            onCheckedChange={() =>
                              handleToggleSetting('showAnalysisPanel')
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </div>
  )
}
