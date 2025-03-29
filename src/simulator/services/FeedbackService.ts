import type {
  FeedbackServiceInterface,
  RealTimeFeedback,
  Scenario,
} from '../types'
import {
  FeedbackModelConfig,
  FeedbackType,
  SimulationScenario,
  TherapeuticTechnique,
} from '../types'

/**
 * Service for processing real-time audio and generating therapeutic feedback
 * Uses client-side processing with zero data retention for HIPAA compliance
 */
export class FeedbackService implements FeedbackServiceInterface {
  private currentScenario: Scenario | null = null
  private feedbackBuffer: RealTimeFeedback[] = []
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  private analyzer: AnalyserNode | null = null
  private lastProcessedTimestamp: number = 0
  private processingThrottleMs: number = 750 // Throttle processing to avoid excessive CPU usage
  private emotionState: {
    energy: number
    valence: number
    dominance: number
    trends: Array<{
      timestamp: number
      energy: number
      valence: number
      dominance: number
    }>
  } = {
    energy: 0.5,
    valence: 0.5,
    dominance: 0.5,
    trends: [],
  }
  private speechPatterns: {
    pauseCount: number
    averagePauseDuration: number
    speakingRate: number // words per minute
    toneVariation: number // standard deviation of pitch
    volumeVariation: number // standard deviation of volume
  } = {
    pauseCount: 0,
    averagePauseDuration: 0,
    speakingRate: 0,
    toneVariation: 0,
    volumeVariation: 0,
  }
  private detectedKeywords: Map<string, number> = new Map() // Maps keywords to frequency
  private detectedTechniques: Map<TherapeuticTechnique, number> = new Map()
  private clientResponsePredictions: Array<{
    keyword: string
    likelihood: number
    emotionalImpact: number
  }> = []

  constructor() {
    // Initialize audio context if available
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        this.audioContext = new window.AudioContext()
        this.setupAudioAnalysis()
      } catch (e) {
        console.error('Failed to initialize AudioContext:', e)
      }
    }
  }

  /**
   * Sets up audio analysis nodes for advanced processing
   */
  private setupAudioAnalysis(): void {
    if (!this.audioContext) return

    // Create analyzer node for frequency and time domain analysis
    this.analyzer = this.audioContext.createAnalyser()
    this.analyzer.fftSize = 2048
    this.analyzer.smoothingTimeConstant = 0.8

    // Create script processor node for custom processing
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
    this.processor.onaudioprocess = this.handleAudioProcess.bind(this)

    // Connect nodes
    this.analyzer.connect(this.processor)
    this.processor.connect(this.audioContext.destination)
  }

  /**
   * Audio processing callback function for real-time analysis
   */
  private handleAudioProcess(event: AudioProcessingEvent): void {
    // Get input data
    const inputData = event.inputBuffer.getChannelData(0)

    // Perform various analyses on the audio data
    this.analyzeAudioCharacteristics(inputData, event.inputBuffer.sampleRate)

    // Update emotion state based on audio characteristics
    this.updateEmotionState(inputData)

    // Update speech patterns
    this.detectSpeechPatterns(inputData, event.inputBuffer.sampleRate)
  }

  /**
   * Analyzes audio for therapeutic characteristics
   */
  private analyzeAudioCharacteristics(
    audioData: Float32Array,
    sampleRate: number,
  ): void {
    // Calculate RMS (loudness)
    let sumSquares = 0
    for (let i = 0; i < audioData.length; i++) {
      sumSquares += audioData[i] * audioData[i]
    }
    const rms = Math.sqrt(sumSquares / audioData.length)

    // Calculate zero-crossing rate (higher values often indicate higher-frequency content)
    let zeroCrossings = 0
    for (let i = 1; i < audioData.length; i++) {
      if (
        (audioData[i] >= 0 && audioData[i - 1] < 0) ||
        (audioData[i] < 0 && audioData[i - 1] >= 0)
      ) {
        zeroCrossings++
      }
    }
    const zcr = zeroCrossings / (audioData.length - 1)

    // Update speech characteristics based on these measurements
    this.speechPatterns.volumeVariation = Math.max(0, Math.min(1, rms * 10)) // Normalize to 0-1
    this.speechPatterns.toneVariation = Math.max(0, Math.min(1, zcr * 5)) // Normalize to 0-1
  }

  /**
   * Updates the current emotional state based on audio characteristics
   */
  private updateEmotionState(audioData: Float32Array): void {
    // Simple emotion detection based on audio characteristics
    // In a real implementation, this would use more sophisticated ML models

    // Calculate energy from audio volume and variation
    const energy = this.calculateEnergy(audioData)

    // Calculate valence (positive/negative affect) - this is a placeholder
    // In a real implementation, this would be based on ML analysis
    const valence = this.emotionState.valence * 0.8 + Math.random() * 0.2

    // Calculate dominance (control/submission) - this is a placeholder
    // In a real implementation, this would be based on ML analysis
    const dominance = this.emotionState.dominance * 0.9 + Math.random() * 0.1

    // Update emotion state with smoothing
    this.emotionState.energy = this.emotionState.energy * 0.7 + energy * 0.3
    this.emotionState.valence = valence
    this.emotionState.dominance = dominance

    // Record trend data for tracking emotional changes over time
    this.emotionState.trends.push({
      timestamp: Date.now(),
      energy: this.emotionState.energy,
      valence: this.emotionState.valence,
      dominance: this.emotionState.dominance,
    })

    // Keep only the last 60 seconds of trend data
    const cutoffTime = Date.now() - 60000
    this.emotionState.trends = this.emotionState.trends.filter(
      (trend) => trend.timestamp >= cutoffTime,
    )
  }

  /**
   * Calculate energy level from audio data
   */
  private calculateEnergy(audioData: Float32Array): number {
    // Calculate RMS (root mean square) of audio data
    let sumSquares = 0
    for (let i = 0; i < audioData.length; i++) {
      sumSquares += audioData[i] * audioData[i]
    }
    const rms = Math.sqrt(sumSquares / audioData.length)

    // Normalize to 0-1 range
    return Math.min(1, rms * 10)
  }

  /**
   * Detects speech patterns like pauses, speaking rate, etc.
   */
  private detectSpeechPatterns(
    audioData: Float32Array,
    sampleRate: number,
  ): void {
    // Calculate RMS
    let sumSquares = 0
    for (let i = 0; i < audioData.length; i++) {
      sumSquares += audioData[i] * audioData[i]
    }
    const rms = Math.sqrt(sumSquares / audioData.length)

    // Detect pause if volume is below threshold
    const isCurrentlyPaused = rms < 0.01

    // In a real implementation, this would analyze pauses, speech rate,
    // and other patterns in more detail using ML models

    // Update speech rate estimation (placeholder implementation)
    this.speechPatterns.speakingRate = isCurrentlyPaused
      ? this.speechPatterns.speakingRate * 0.95
      : this.speechPatterns.speakingRate * 0.95 + 0.05 * 120 // Target around 120 wpm
  }

  /**
   * Process audio chunk and generate feedback if appropriate
   * All processing happens client-side with no data retention
   */
  async processFeedback(
    audioChunk: Float32Array,
    duration: number,
  ): Promise<RealTimeFeedback | null> {
    // Ensure we have a scenario context
    if (!this.currentScenario) {
      return null
    }

    // Throttle processing to avoid excessive CPU usage
    const now = Date.now()
    if (now - this.lastProcessedTimestamp < this.processingThrottleMs) {
      return null
    }
    this.lastProcessedTimestamp = now

    // In a real implementation, this would process audio using client-side ML models
    // For this demo, we'll generate feedback based on timing and simple thresholds

    // Sample emotion values for demonstration
    const currentValence = this.emotionState.valence || 0.5
    const currentEnergy = this.emotionState.energy || 0.5
    const currentDominance = this.emotionState.dominance || 0.5

    // Detect if there's a significant emotional change
    const emotionChange = this.detectEmotionalChange()

    // Analyze current therapeutic approach
    const currentApproach = this.analyzeTherapeuticApproach(
      currentValence,
      currentEnergy,
    )

    // Generate appropriate feedback based on context and approach
    if (emotionChange && Math.random() < 0.7) {
      // Generate emotion-based feedback
      return this.generateEmotionFeedback(emotionChange, currentApproach)
    } else if (this.speechPatterns.speakingRate > 150 && Math.random() < 0.4) {
      // Feedback on speaking rate if too fast
      return {
        type: 'communication_style',
        timestamp: Date.now(),
        suggestion:
          'Consider slowing your speaking pace slightly to give the client more processing time.',
        rationale:
          'A moderate speaking rate helps clients absorb complex emotional content, particularly when discussing sensitive topics.',
        priority: 'medium',
        context: this.currentScenario.domain,
      }
    } else if (this.speechPatterns.pauseCount < 2 && Math.random() < 0.3) {
      // Feedback on pausing
      return {
        type: 'active_listening',
        timestamp: Date.now(),
        suggestion:
          'Try incorporating more brief pauses to allow the client space to process.',
        rationale:
          'Strategic pauses demonstrate attentive listening and create space for deeper reflection.',
        priority: 'low',
        context: this.currentScenario.domain,
      }
    } else if (
      currentDominance > 0.7 &&
      this.currentScenario.domain === 'trauma'
    ) {
      // Feedback on counselor dominance in trauma scenarios
      return {
        type: 'therapeutic_alliance',
        timestamp: Date.now(),
        suggestion:
          'Consider a more collaborative approach that emphasizes client autonomy and choice.',
        rationale:
          'In trauma work, maintaining client agency is particularly important for building safety and trust.',
        priority: 'high',
        context: 'trauma',
      }
    }

    // Most of the time, return null to avoid overwhelming the user with feedback
    return null
  }

  /**
   * Detects significant changes in emotional state
   */
  private detectEmotionalChange(): 'positive' | 'negative' | 'neutral' | null {
    // Need at least a few data points to detect change
    if (this.emotionState.trends.length < 5) return null

    // Get recent trend data
    const recentTrends = this.emotionState.trends.slice(-5)

    // Calculate average valence change
    let valenceChange = 0
    for (let i = 1; i < recentTrends.length; i++) {
      valenceChange += recentTrends[i].valence - recentTrends[i - 1].valence
    }
    valenceChange /= recentTrends.length - 1

    // Calculate average energy change
    let energyChange = 0
    for (let i = 1; i < recentTrends.length; i++) {
      energyChange += recentTrends[i].energy - recentTrends[i - 1].energy
    }
    energyChange /= recentTrends.length - 1

    // Determine if there's a significant change
    const significantChange =
      Math.abs(valenceChange) > 0.1 || Math.abs(energyChange) > 0.15
    if (!significantChange) return null

    // Classify the change
    if (valenceChange > 0.05) return 'positive'
    if (valenceChange < -0.05) return 'negative'
    return 'neutral'
  }

  /**
   * Analyzes the current therapeutic approach based on emotional metrics
   */
  private analyzeTherapeuticApproach(
    valence: number,
    energy: number,
  ): TherapeuticTechnique | null {
    // In a real implementation, this would use more sophisticated ML models
    // This is a simplified placeholder implementation

    // High energy, low valence might indicate active challenging
    if (energy > 0.7 && valence < 0.4) {
      return TherapeuticTechnique.COGNITIVE_RESTRUCTURING
    }

    // Low energy, moderate to high valence might indicate reflective listening
    if (energy < 0.4 && valence > 0.5) {
      return TherapeuticTechnique.REFLECTIVE_STATEMENTS
    }

    // High energy, high valence might indicate motivational interviewing
    if (energy > 0.7 && valence > 0.7) {
      return TherapeuticTechnique.MOTIVATIONAL_INTERVIEWING
    }

    // Low energy, low valence might indicate validation
    if (energy < 0.4 && valence < 0.4) {
      return TherapeuticTechnique.VALIDATION
    }

    // Moderate energy and valence might indicate open questioning
    if (energy > 0.4 && energy < 0.6 && valence > 0.4 && valence < 0.6) {
      return TherapeuticTechnique.OPEN_ENDED_QUESTIONS
    }

    return null
  }

  /**
   * Generates feedback based on detected emotional change
   */
  private generateEmotionFeedback(
    emotionChange: 'positive' | 'negative' | 'neutral',
    currentApproach: TherapeuticTechnique | null,
  ): RealTimeFeedback {
    // Generate appropriate feedback based on emotional change direction

    if (emotionChange === 'positive') {
      return {
        type: 'empathetic_response',
        timestamp: Date.now(),
        suggestion:
          "The client's emotional state appears to be shifting positively. Consider acknowledging this change.",
        rationale:
          'Recognizing positive emotional shifts reinforces progress and helps build therapeutic momentum.',
        priority: 'medium',
        context: this.currentScenario?.domain,
      }
    } else if (emotionChange === 'negative') {
      // If using cognitive restructuring during a negative shift, suggest validation
      if (currentApproach === TherapeuticTechnique.COGNITIVE_RESTRUCTURING) {
        return {
          type: 'technique_application',
          timestamp: Date.now(),
          suggestion:
            'The client may need validation before cognitive restructuring as their emotional state intensifies.',
          rationale:
            'Validation creates safety during heightened emotions, making clients more receptive to cognitive work later.',
          priority: 'high',
          context: this.currentScenario?.domain,
        }
      }

      return {
        type: 'therapeutic_alliance',
        timestamp: Date.now(),
        suggestion:
          "The client's emotional intensity is increasing. Consider validating their experience before proceeding.",
        rationale:
          'Validation during emotional intensity strengthens the therapeutic alliance and models emotional acceptance.',
        priority: 'high',
        context: this.currentScenario?.domain,
      }
    } else {
      return {
        type: 'question_formulation',
        timestamp: Date.now(),
        suggestion:
          "Consider using a reflective statement to clarify the client's current emotional experience.",
        rationale:
          'Reflection helps clients articulate emotional experiences that may be difficult to express directly.',
        priority: 'low',
        context: this.currentScenario?.domain,
      }
    }
  }

  /**
   * Sets the scenario context for feedback generation
   */
  setScenarioContext(scenario: Scenario): void {
    this.currentScenario = scenario
    this.clearFeedbackBuffer()

    // Reset emotion state
    this.emotionState = {
      energy: 0.5,
      valence: 0.5,
      dominance: 0.5,
      trends: [],
    }

    // Reset speech patterns
    this.speechPatterns = {
      pauseCount: 0,
      averagePauseDuration: 0,
      speakingRate: 0,
      toneVariation: 0,
      volumeVariation: 0,
    }

    // Clear detected elements
    this.detectedKeywords.clear()
    this.detectedTechniques.clear()
    this.clientResponsePredictions = []
  }

  /**
   * Clears all context and feedback
   */
  clearContext(): void {
    this.currentScenario = null
    this.clearFeedbackBuffer()

    // Reset all speech and emotion analysis data
    this.emotionState = {
      energy: 0.5,
      valence: 0.5,
      dominance: 0.5,
      trends: [],
    }

    this.speechPatterns = {
      pauseCount: 0,
      averagePauseDuration: 0,
      speakingRate: 0,
      toneVariation: 0,
      volumeVariation: 0,
    }

    this.detectedKeywords.clear()
    this.detectedTechniques.clear()
    this.clientResponsePredictions = []
  }

  /**
   * Clears the feedback buffer
   */
  private clearFeedbackBuffer(): void {
    this.feedbackBuffer = []
  }

  /**
   * Cleanup method to release resources
   */
  cleanup(): void {
    // Clean up audio context if it exists
    if (this.processor) {
      this.processor.disconnect()
      this.processor = null
    }

    if (this.analyzer) {
      this.analyzer.disconnect()
      this.analyzer = null
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch((err) => {
        console.error('Error closing AudioContext:', err)
      })
      this.audioContext = null
    }

    // Clear all data
    this.clearContext()
  }
}
