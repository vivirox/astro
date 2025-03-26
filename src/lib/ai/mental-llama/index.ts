/**
 * MentalLLaMA Integration
 * Based on https://github.com/SteveKGYang/MentalLLaMA
 *
 * The first open-source instruction following large language model
 * for interpretable mental health analysis.
 */

export { MentalLLaMAAdapter } from './MentalLLaMAAdapter'
export {
  MentalLLaMAFactory,
  type MentalLLaMAConfig,
} from './MentalLLaMAFactory'
export { MentalLLaMAPythonBridge } from './PythonBridge'

/**
 * MentalLLaMA Core Components
 *
 * - Interpretable Mental Health Analysis: Analyze and explain mental health indicators in text
 * - IMHI Benchmark: Evaluate models on interpretable mental health inference
 * - Explanation Quality Evaluation: Assess explanations using BART-score and other metrics
 * - Expert-Written Explanations: Use expert-written examples as templates and references
 */
