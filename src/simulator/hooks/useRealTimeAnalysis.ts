import { useState, useEffect, useCallback } from 'react'
import type { RealTimeFeedback, Scenario } from '../types'
import { FeedbackType, TherapeuticTechnique } from '../types'
import { FeedbackService } from '../services/FeedbackService'
import { WebRTCService } from '../services/WebRTCService'
import { getUserConsentPreference } from '../utils/privacy'

// Default WebRTC configuration
const DEFAULT_WEBRTC_CONFIG = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
  sdpSemantics: 'unified-plan' as const,
}

/**
 * Custom hook for real-time therapeutic analysis and feedback
 * Manages WebRTC connections and real-time feedback generation with privacy-first approach
 */
export function useRealTimeAnalysis(scenario: Scenario | null) {
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [feedback, setFeedback] = useState<RealTimeFeedback[]>([])
  const [error, setError] = useState<string | null>(null)
  const [webrtcService] = useState<WebRTCService>(() => new WebRTCService())
  const [feedbackService] = useState<FeedbackService>(
    () => new FeedbackService(),
  )
  const [detectedTechniques, setDetectedTechniques] = useState<
    TherapeuticTechnique[]
  >([])
  const [emotionInsights, setEmotionInsights] = useState<{
    energy: number
    valence: number
    dominance: number
  }>({ energy: 0.5, valence: 0.5, dominance: 0.5 })
  const [hasConsent, setHasConsent] = useState<boolean>(
    getUserConsentPreference(),
  )

  // Initialize services when the component mounts
  useEffect(() => {
    const initializeServices = async () => {
      try {
        await webrtcService.initializeConnection(DEFAULT_WEBRTC_CONFIG)
        setIsInitialized(true)
      } catch (err) {
        console.error('Failed to initialize services:', err)
        setError('Failed to initialize real-time analysis services')
      }
    }

    initializeServices()

    // Cleanup on unmount
    return () => {
      stopAnalysis()
    }
  }, [])

  // Update feedback service when scenario changes
  useEffect(() => {
    if (scenario) {
      feedbackService.setScenarioContext(scenario)
    } else {
      feedbackService.clearContext()
    }
  }, [scenario])

  /**
   * Start real-time analysis
   * Initializes WebRTC connection and begins processing audio
   */
  const startAnalysis = useCallback(async () => {
    if (!isInitialized) {
      setError('Services not initialized yet')
      return
    }

    if (isAnalyzing) {
      return // Already analyzing
    }

    setError(null)
    setFeedback([])

    try {
      // Create local media stream
      const stream = await webrtcService.createLocalStream(true, false)
      setLocalStream(stream)

      // Configure stream listeners
      webrtcService.onStream((stream) => {
        setRemoteStream(stream)
      })

      webrtcService.onDisconnect(() => {
        setIsConnected(false)
        setIsAnalyzing(false)
      })

      // Connect to simulated peer
      await webrtcService.connectToPeer()
      setIsConnected(true)
      setIsAnalyzing(true)

      // Start audio analysis process
      startAudioAnalysis(stream)
    } catch (err) {
      console.error('Failed to start analysis:', err)
      setError('Failed to access microphone or establish connection')
      setIsAnalyzing(false)
    }
  }, [isInitialized, isAnalyzing])

  /**
   * Process audio for real-time feedback
   */
  const startAudioAnalysis = useCallback(
    (stream: MediaStream) => {
      if (!stream) return

      // For demonstration purposes, we'll simulate periodic feedback
      // In a real implementation, this would use the audio processing API
      const analysisInterval = setInterval(() => {
        if (!isAnalyzing) {
          clearInterval(analysisInterval)
          return
        }

        // Create a mock audio chunk for demonstration
        // In a real implementation, this would be actual audio data
        const mockAudioChunk = new Float32Array(1024)
        for (let i = 0; i < mockAudioChunk.length; i++) {
          mockAudioChunk[i] = Math.random() * 2 - 1 // Random values between -1 and 1
        }

        // Process the mock audio chunk
        feedbackService
          .processFeedback(mockAudioChunk, 0.5)
          .then((result) => {
            if (result) {
              // Add new feedback to the list
              setFeedback((prev) => {
                // Keep only the 10 most recent feedback items
                const updated = [...prev, result].slice(-10)
                return updated
              })
            }
          })
          .catch((err) => {
            console.error('Error processing audio:', err)
          })

        // Simulate detecting techniques
        simulateDetectingTechniques()

        // Simulate emotion insights
        simulateEmotionInsights()
      }, 3000)

      return () => {
        clearInterval(analysisInterval)
      }
    },
    [isAnalyzing],
  )

  /**
   * Simulate detecting therapeutic techniques
   * In a real implementation, this would use ML models to detect techniques
   */
  const simulateDetectingTechniques = useCallback(() => {
    // List of possible techniques
    const techniques = Object.values(TherapeuticTechnique)

    // Randomly select 1-3 techniques
    const numTechniques = Math.floor(Math.random() * 3) + 1
    const selectedTechniques: TherapeuticTechnique[] = []

    for (let i = 0; i < numTechniques; i++) {
      const techniqueIndex = Math.floor(Math.random() * techniques.length)
      const technique = techniques[techniqueIndex]

      if (!selectedTechniques.includes(technique)) {
        selectedTechniques.push(technique)
      }
    }

    setDetectedTechniques(selectedTechniques)
  }, [])

  /**
   * Simulate emotion insights from audio
   * In a real implementation, this would use ML models for emotion detection
   */
  const simulateEmotionInsights = useCallback(() => {
    // Simulate gradual changes in emotion values
    setEmotionInsights((prev) => {
      return {
        energy: Math.max(
          0,
          Math.min(1, prev.energy + (Math.random() * 0.2 - 0.1)),
        ),
        valence: Math.max(
          0,
          Math.min(1, prev.valence + (Math.random() * 0.2 - 0.1)),
        ),
        dominance: Math.max(
          0,
          Math.min(1, prev.dominance + (Math.random() * 0.2 - 0.1)),
        ),
      }
    })
  }, [])

  /**
   * Stop real-time analysis
   * Cleans up WebRTC connection and stops processing
   */
  const stopAnalysis = useCallback(() => {
    if (!isAnalyzing) return

    // Disconnect WebRTC
    webrtcService.disconnectFromPeer()

    // Clear feedback
    feedbackService.clearContext()

    // Reset state
    setIsAnalyzing(false)
    setIsConnected(false)
    setLocalStream(null)
    setRemoteStream(null)
  }, [isAnalyzing])

  /**
   * Clear all feedback
   */
  const clearFeedback = useCallback(() => {
    setFeedback([])
  }, [])

  /**
   * Update consent for analytics
   */
  const updateConsent = useCallback((consent: boolean) => {
    setHasConsent(consent)
  }, [])

  return {
    isInitialized,
    isConnected,
    isAnalyzing,
    localStream,
    remoteStream,
    feedback,
    error,
    detectedTechniques,
    emotionInsights,
    hasConsent,
    startAnalysis,
    stopAnalysis,
    clearFeedback,
    updateConsent,
  }
}
