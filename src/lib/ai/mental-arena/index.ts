/**
 * MentalArena Integration
 * Based on https://github.com/Scarelette/MentalArena
 *
 * A self-play framework to train language models for diagnosis
 * and treatment of mental health disorders by generating
 * domain-specific personalized data.
 */

export { MentalArenaAdapter } from './MentalArenaAdapter'
export {
  MentalArenaFactory,
  type MentalArenaConfig,
} from './MentalArenaFactory'
export { MentalArenaPythonBridge } from './PythonBridge'

/**
 * MentalArena Core Components
 *
 * - Symptom Encoder: Simulates a realistic patient from cognitive and behavioral perspectives
 * - Symptom Decoder: Compares diagnosed symptoms with encoded symptoms and manages dialogue
 * - Self-Play Training: Generates domain-specific personalized data through interactions
 * - Iterative Training: Fine-tunes models on generated data for continuous improvement
 */
