/**
 * Real-time Therapeutic Practice Simulator
 *
 * A HIPAA-compliant simulator for practicing therapeutic techniques
 * with zero data retention and real-time feedback.
 */

// Components
export { SimulationContainer } from './components/SimulationContainer';
export { EnhancedSimulationContainer } from './components/EnhancedSimulationContainer';
export { ScenarioSelector } from './components/ScenarioSelector';
export { default as EmpathyMeter } from './components/EmpathyMeter';
export { default as RealTimeFeedbackPanel } from './components/RealTimeFeedbackPanel';

// Context and Provider
export { SimulatorProvider, useSimulatorContext } from './context/SimulatorProvider';

// Hooks
export { useSimulator } from './hooks/useSimulator';
export { useAnonymizedMetrics } from './hooks/useAnonymizedMetrics';
export { useRealTimeAnalysis } from './hooks/useRealTimeAnalysis';

// Types
export type {
  Scenario,
  SimulationFeedback,
  SimulatorContext,
  SimulatorProviderProps,
  SimulationContainerProps,
  ScenarioSelectorProps,
  AnonymizedMetrics,
  RealTimeFeedback
} from './types';

export {
  TherapeuticDomain,
  ScenarioDifficulty,
  TherapeuticTechnique,
  FeedbackType
} from './types';

// Utils and Data
export { getAllScenarios, getScenarioById, getScenariosByDomain, getScenariosByDifficulty } from './data/scenarios';
export {
  getUserConsentPreference,
  setUserConsentPreference,
  checkBrowserCompatibility,
  anonymizeFeedback,
  generateConsentForm
} from './utils/privacy';

// Export main simulator components
export { default as FeedbackPanel } from './components/FeedbackPanel';
export { default as ScenarioInfo } from './components/ScenarioInfo';
export { default as VideoDisplay } from './components/VideoDisplay';
export { default as ControlPanel } from './components/ControlPanel';

// Export services
export { WebRTCService } from './services/WebRTCService';
export { FeedbackService } from './services/FeedbackService';

/**
 * Real-Time Healthcare Simulation Module
 *
 * This module provides a privacy-first, real-time simulation environment for
 * healthcare practitioners to practice therapeutic interactions without any
 * data recording or persistent storage. All processing happens in real-time
 * with zero data retention to ensure HIPAA compliance and user privacy.
 *
 * Key features:
 * - Real-time interaction via WebRTC
 * - Zero data retention with privacy-first design
 * - Immediate AI-powered feedback
 * - Voice recognition for more natural interaction
 * - Real-time empathy measurement and therapeutic technique detection
 * - Anonymized metrics collection (with user consent only)
 *
 * Usage:
 * 1. Wrap your application with SimulatorProvider
 * 2. Use the EnhancedSimulationContainer component for the full experience
 * 3. Access simulation state and functions through the useSimulator hook
 *
 * Example:
 * ```tsx
 * import { SimulatorProvider, EnhancedSimulationContainer } from './simulator';
 *
 * const App = () => {
 *   return (
 *     <SimulatorProvider>
 *       <EnhancedSimulationContainer scenarioId="anxiety-001" />
 *     </SimulatorProvider>
 *   );
 * };
 * ```
 */
