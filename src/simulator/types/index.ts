/**
 * Core type definitions for the real-time healthcare simulation module
 */

/**
 * Therapeutic domains available for simulation
 */
export enum TherapeuticDomain {
  DEPRESSION = 'depression',
  ANXIETY = 'anxiety',
  TRAUMA = 'trauma',
  SUBSTANCE_USE = 'substance_use',
  GRIEF = 'grief',
  RELATIONSHIP = 'relationship',
  STRESS_MANAGEMENT = 'stress_management',
  CRISIS_INTERVENTION = 'crisis_intervention'
}

/**
 * Difficulty levels for scenarios
 */
export enum ScenarioDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Types of therapeutic techniques that can be practiced and evaluated
 */
export enum TherapeuticTechnique {
  ACTIVE_LISTENING = 'active_listening',
  REFLECTIVE_STATEMENTS = 'reflective_statements',
  OPEN_ENDED_QUESTIONS = 'open_ended_questions',
  VALIDATION = 'validation',
  MOTIVATIONAL_INTERVIEWING = 'motivational_interviewing',
  COGNITIVE_RESTRUCTURING = 'cognitive_restructuring',
  GOAL_SETTING = 'goal_setting',
  MINDFULNESS = 'mindfulness',
  BEHAVIORAL_ACTIVATION = 'behavioral_activation',
  GROUNDING_TECHNIQUES = 'grounding_techniques'
}

/**
 * Types of feedback that can be provided
 */
export enum FeedbackType {
  POSITIVE = 'positive',
  DEVELOPMENTAL = 'developmental',
  TECHNIQUE_SUGGESTION = 'technique_suggestion',
  ALTERNATIVE_APPROACH = 'alternative_approach'
}

/**
 * Interface for a practice scenario
 */
export interface Scenario {
  id: string;
  title: string;
  description: string;
  domain: TherapeuticDomain;
  difficulty: ScenarioDifficulty;
  techniques: TherapeuticTechnique[];
  contextDescription: string;
  clientBackground: string;
  presentingIssue: string;
  objectives: string[];
  suggestedApproaches?: string[];
}

/**
 * Interface for anonymized metrics
 */
export interface AnonymizedMetrics {
  techniquesUsed: Record<TherapeuticTechnique, number>;
  domainsExplored: Record<TherapeuticDomain, number>;
  feedbackReceived: Record<FeedbackType, number>;
  skillProgress: Record<TherapeuticTechnique, number>;
  sessionsCompleted: number;
  lastSessionDate?: number;
}

/**
 * Simulation feedback for a response
 */
export interface SimulationFeedback {
  type: FeedbackType;
  message: string;
  detectedTechniques: TherapeuticTechnique[];
  alternativeResponses?: string[];
  techniqueSuggestions?: TherapeuticTechnique[];
}

/**
 * Props for the Simulator Provider component
 */
export interface SimulatorProviderProps {
  children: React.ReactNode;
}

/**
 * Props for the Simulation Container component
 */
export interface SimulationContainerProps {
  scenarioId?: string;
  onBackToScenarios?: () => void;
}

/**
 * Props for the Scenario Selector component
 */
export interface ScenarioSelectorProps {
  onSelectScenario: (scenarioId: string) => void;
}

/**
 * Context for the simulator state
 */
export interface SimulatorContext {
  currentScenario?: Scenario;
  setCurrentScenario: (scenario: Scenario | undefined) => void;
  isProcessing: boolean;
  feedback?: SimulationFeedback;
  startSimulation: (scenarioId: string) => Promise<void>;
  sendResponse: (response: string) => Promise<SimulationFeedback>;
  metricsConsent: boolean;
  setMetricsConsent: (consent: boolean) => void;
}

export type UserSession = {
  userId: string;
  sessionId: string;
  startTime: number;
  scenarioId: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
};

export type RealTimeFeedback = {
  type: FeedbackType;
  timestamp: number;
  suggestion: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
  context?: string;
};

export type AnonymizedMetric = {
  metricId: string;
  timestamp: number;
  sessionHash: string; // one-way hash of the session ID
  scenarioId: string;
  domain: TherapeuticDomain;
  skillArea: FeedbackType;
  skillScore: number; // 0-100 normalized score
  improvementFromLast?: number;
};

export type WebRTCConnectionConfig = {
  iceServers: Array<{
    urls: string[];
    username?: string;
    credential?: string;
  }>;
  iceCandidatePoolSize?: number;
  sdpSemantics: 'unified-plan';
};

export type FeedbackModelConfig = {
  modelName: string;
  contextWindowSize: number;
  maxOutputTokens: number;
  temperatureValue: number;
  responseFormat: 'json' | 'text';
};

export interface SimulatorContextType {
  currentScenario: Scenario | null;
  isConnected: boolean;
  isProcessing: boolean;
  realtimeFeedback: RealTimeFeedback[];
  connectionStatus: UserSession['connectionStatus'];
  startSimulation: (scenarioId: string) => Promise<void>;
  endSimulation: () => Promise<void>;
  clearFeedback: () => void;
}

export interface WebRTCServiceInterface {
  initializeConnection: (config: WebRTCConnectionConfig) => Promise<void>;
  createLocalStream: (audioConstraints: MediaStreamConstraints['audio'], videoConstraints: MediaStreamConstraints['video']) => Promise<MediaStream>;
  connectToPeer: () => Promise<void>;
  disconnectFromPeer: () => void;
  onStream: (callback: (stream: MediaStream) => void) => void;
  onDisconnect: (callback: () => void) => void;
}

export interface FeedbackServiceInterface {
  processFeedback: (audioChunk: Float32Array, duration: number) => Promise<RealTimeFeedback | null>;
  setScenarioContext: (scenario: Scenario) => void;
  clearContext: () => void;
}

// Speech Recognition Types
export interface SpeechRecognitionConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  grammarList?: string[];
}

export interface SpeechRecognitionResult {
  text: string;
  detectedKeywords: string[];
  confidenceScores: Record<string, number>;
  detectedTechniques: Record<string, number>;
}

export interface SpeechRecognitionHookProps {
  domain?: string;
  onFinalResult?: (result: SpeechRecognitionResult) => void;
  onInterimResult?: (text: string) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  autoRestart?: boolean;
  config?: SpeechRecognitionConfig;
}

export interface SpeechRecognitionHookResult {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  detectedKeywords: string[];
  detectedTechniques: Record<string, number>;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  toggleListening: () => void;
}

// Therapeutic Prompt Types
export interface TherapeuticPrompt {
  text: string;
  keywordTriggers: string[];
  domain: TherapeuticDomain | 'general';
  confidence: number;
}
