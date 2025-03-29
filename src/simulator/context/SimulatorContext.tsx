import type { ReactNode } from 'react'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import type {
  FeedbackModelConfig,
  RealTimeFeedback,
  SimulationScenario,
  SimulatorContextType,
  WebRTCConnectionConfig,
} from '../types'
import { WebRTCService } from '../services/WebRTCService'
import { FeedbackService } from '../services/FeedbackService'

// Default context state
const defaultContextValue: SimulatorContextType = {
  currentScenario: null,
  isConnected: false,
  isProcessing: false,
  realtimeFeedback: [],
  connectionStatus: 'disconnected',
  startSimulation: async () => {},
  endSimulation: async () => {},
  clearFeedback: () => {},
}

// Create context
const SimulatorContext =
  createContext<SimulatorContextType>(defaultContextValue)

// Default configurations
const DEFAULT_WEBRTC_CONFIG: WebRTCConnectionConfig = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    },
  ],
  sdpSemantics: 'unified-plan',
}

const DEFAULT_FEEDBACK_MODEL_CONFIG: FeedbackModelConfig = {
  modelName: 'gpt-4-0125-preview',
  contextWindowSize: 16384,
  maxOutputTokens: 1024,
  temperatureValue: 0.7,
  responseFormat: 'json',
}

interface SimulatorProviderProps {
  children: ReactNode
  webRTCConfig?: WebRTCConnectionConfig
  feedbackModelConfig?: FeedbackModelConfig
}

/**
 * Provider component for simulator context
 * Manages simulator state and service interactions
 */
export const SimulatorProvider: React.FC<SimulatorProviderProps> = ({
  children,
  webRTCConfig = DEFAULT_WEBRTC_CONFIG,
  feedbackModelConfig = DEFAULT_FEEDBACK_MODEL_CONFIG,
}) => {
  // State
  const [currentScenario, setCurrentScenario] =
    useState<SimulationScenario | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('disconnected')
  const [realtimeFeedback, setRealtimeFeedback] = useState<RealTimeFeedback[]>(
    [],
  )

  // Services
  const [webRTCService] = useState<WebRTCService>(() => new WebRTCService())
  const [feedbackService] = useState<FeedbackService>(
    () => new FeedbackService(feedbackModelConfig),
  )

  // Audio processing state
  const [audioProcessor, setAudioProcessor] = useState<any>(null)
  const [isAudioProcessing, setIsAudioProcessing] = useState<boolean>(false)

  /**
   * Handle new feedback from the feedback service
   */
  const handleNewFeedback = useCallback((feedback: RealTimeFeedback) => {
    setRealtimeFeedback((prev) => [feedback, ...prev].slice(0, 10)) // Keep only the 10 most recent feedback items
  }, [])

  /**
   * Handle remote stream
   */
  const handleRemoteStream = useCallback(
    (stream: MediaStream) => {
      // In a real implementation, this would set up the audio processing pipeline
      // to analyze the stream in real-time without recording
      console.log('Remote stream received')

      // Simulate processing the stream and generating feedback
      const interval = setInterval(() => {
        // Only process if we're connected and have a scenario
        if (isConnected && currentScenario && !isAudioProcessing) {
          setIsAudioProcessing(true)

          // Create a dummy audio chunk (in a real implementation, this would be from the stream)
          const dummyAudioChunk = new Float32Array(1024)

          // Process the audio chunk
          feedbackService
            .processFeedback(dummyAudioChunk, 1.0)
            .then((feedback) => {
              if (feedback) {
                handleNewFeedback(feedback)
              }
              setIsAudioProcessing(false)
            })
            .catch((err) => {
              console.error('Error processing audio:', err)
              setIsAudioProcessing(false)
            })
        }
      }, 5000) // Generate feedback every 5 seconds in this simulation

      // Clean up the interval when component unmounts
      return () => clearInterval(interval)
    },
    [
      isConnected,
      currentScenario,
      isAudioProcessing,
      feedbackService,
      handleNewFeedback,
    ],
  )

  /**
   * Start a simulation with the specified scenario
   */
  const startSimulation = useCallback(
    async (scenarioId: string) => {
      try {
        setConnectionStatus('connecting')
        setIsProcessing(true)

        // In a real implementation, this would fetch the scenario from an API
        // For now, we'll simulate with a dummy scenario
        const dummyScenario: SimulationScenario = {
          id: scenarioId,
          title: 'Anxiety Management Session',
          description:
            'Practice helping a patient with anxiety disorder develop coping strategies.',
          domain: 'cognitive_behavioral',
          difficulty: 'intermediate',
          targetSkills: [
            'empathetic_response',
            'technique_application',
            'active_listening',
          ],
          scenarioContext:
            'The patient has been experiencing increasing anxiety over the past 6 months, affecting work and relationships.',
          patientBackground:
            'Alex, 32, software engineer with history of generalized anxiety disorder. Recently promoted at work with increased responsibilities.',
          presentingIssues: [
            'Panic attacks',
            'Sleep disturbance',
            'Worry about job performance',
            'Social withdrawal',
          ],
        }

        setCurrentScenario(dummyScenario)

        // Set up the feedback service with the scenario context
        feedbackService.setScenarioContext(dummyScenario)

        // Initialize WebRTC connection
        await webRTCService.initializeConnection(webRTCConfig)

        // Set up stream handlers
        webRTCService.onStream(handleRemoteStream)
        webRTCService.onDisconnect(() => {
          setIsConnected(false)
          setConnectionStatus('disconnected')
        })

        // Create local stream
        // In a real implementation, this would capture the user's audio/video
        await webRTCService.createLocalStream(
          { echoCancellation: true, noiseSuppression: true },
          false,
        )

        // Connect to peer
        await webRTCService.connectToPeer()

        setIsConnected(true)
        setConnectionStatus('connected')
        setIsProcessing(false)
      } catch (error) {
        console.error('Failed to start simulation:', error)
        setConnectionStatus('disconnected')
        setIsProcessing(false)
      }
    },
    [webRTCConfig, webRTCService, feedbackService, handleRemoteStream],
  )

  /**
   * End the current simulation
   */
  const endSimulation = useCallback(async () => {
    try {
      setIsProcessing(true)

      // Disconnect WebRTC
      webRTCService.disconnectFromPeer()

      // Clear feedback service context
      feedbackService.clearContext()

      // Reset state
      setCurrentScenario(null)
      setRealtimeFeedback([])
      setIsConnected(false)
      setConnectionStatus('disconnected')
      setIsProcessing(false)
    } catch (error) {
      console.error('Failed to end simulation:', error)
      setIsProcessing(false)
    }
  }, [webRTCService, feedbackService])

  /**
   * Clear all feedback
   */
  const clearFeedback = useCallback(() => {
    setRealtimeFeedback([])
  }, [])

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (isConnected) {
        webRTCService.disconnectFromPeer()
        feedbackService.clearContext()
      }
    }
  }, [isConnected, webRTCService, feedbackService])

  // Context value
  const contextValue: SimulatorContextType = {
    currentScenario,
    isConnected,
    isProcessing,
    realtimeFeedback,
    connectionStatus,
    startSimulation,
    endSimulation,
    clearFeedback,
  }

  return (
    <SimulatorContext.Provider value={contextValue}>
      {children}
    </SimulatorContext.Provider>
  )
}

/**
 * Hook for consuming simulator context
 */
export const useSimulator = (): SimulatorContextType => {
  const context = useContext(SimulatorContext)

  if (context === undefined) {
    throw new Error('useSimulator must be used within a SimulatorProvider')
  }

  return context
}
