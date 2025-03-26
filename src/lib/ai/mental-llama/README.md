# MentalLLaMA Integration

This directory contains an integration with [MentalLLaMA](https://github.com/SteveKGYang/MentalLLaMA), the first open-source instruction following large language model for interpretable mental health analysis.

## Overview

MentalLLaMA enhances our EmotionLLaMA implementation by providing:

1. **Interpretable Mental Health Analysis** - Analyze and explain mental health indicators in text
2. **IMHI Benchmark** - Comprehensive benchmark for evaluating mental health analysis capabilities
3. **Explanation Quality Evaluation** - Assess explanations using BART-score and other metrics
4. **Expert-Written Explanations** - Use expert-written examples as templates and references

## Integration Components

- `MentalLLaMAAdapter` - TypeScript adapter for MentalLLaMA functionality
- `MentalLLaMAFactory` - Factory for creating MentalLLaMA adapters
- `MentalLLaMAPythonBridge` - Bridge to execute original MentalLLaMA Python code

## Supported Mental Health Categories

The integration now supports comprehensive detection and analysis of the following mental health categories:

- **Depression** - Major depressive disorder
- **Anxiety** - Generalized anxiety disorder
- **PTSD** - Post-traumatic stress disorder
- **Suicidality** - Suicide risk assessment
- **Bipolar Disorder** - Mood episodes with mania and depression
- **OCD** - Obsessive-compulsive disorder
- **Eating Disorders** - Various eating-related disorders
- **Social Anxiety** - Social anxiety disorder
- **Panic Disorder** - Panic attacks and related anxiety

Each category includes specific detection patterns, evidence extraction rules, and expert-written explanations.

## Usage

### TypeScript Implementation

```typescript
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Create adapter from environment variables
const { adapter } = await MentalLLaMAFactory.createFromEnv()

// Analyze text for mental health indicators
const analysisResult = await adapter.analyzeMentalHealth(text)
console.log(`Mental Health Issue: ${analysisResult.hasMentalHealthIssue}`)
console.log(`Category: ${analysisResult.mentalHealthCategory}`)
console.log(`Explanation: ${analysisResult.explanation}`)
console.log(`Supporting Evidence:`, analysisResult.supportingEvidence)

// Using expert-guided explanations (NEW)
const expertAnalysis = await adapter.analyzeMentalHealthWithExpertGuidance(text)
console.log(`Expert-guided explanation: ${expertAnalysis.explanation}`)
console.log(`Expert guidance used: ${expertAnalysis.expertGuided}`)

// Evaluate explanation quality
const qualityMetrics = await adapter.evaluateExplanationQuality(analysisResult.explanation)
console.log(`Quality: ${qualityMetrics.overall.toFixed(2)}/5.00`)
```

### Python Bridge

For advanced features, you can use the Python bridge to interact with the original MentalLLaMA codebase:

```typescript
import { MentalLLaMAFactory } from '../lib/ai/mental-llama'

// Create adapter with Python bridge
const { adapter, pythonBridge } = await MentalLLaMAFactory.createFromEnv()

// Run IMHI benchmark evaluation
if (pythonBridge) {
  const result = await pythonBridge.runIMHIEvaluation({
    modelPath: '/path/to/model',
    outputPath: './imhi-results',
    testDataset: 'IMHI',
    isLlama: true
  })
  
  // Evaluate explanation quality using BART-score
  await pythonBridge.evaluateExplanationQuality({
    generatedDirName: 'responses',
    scoreMethod: 'bart_score'
  })
}
```

## Command Line Tool

A command-line tool is available for analyzing text with MentalLLaMA:

```bash
# List supported mental health categories
ts-node src/scripts/mental-llama-analyze.ts --list-categories

# Analyze text for mental health indicators
ts-node src/scripts/mental-llama-analyze.ts --text "I've been feeling really sad and hopeless lately. Nothing seems worth doing anymore." --evaluate-explanation

# Use expert-guided explanations (NEW)
ts-node src/scripts/mental-llama-analyze.ts --text "I've been feeling really sad and hopeless lately. Nothing seems worth doing anymore." --expert

# Analyze text from a file
ts-node src/scripts/mental-llama-analyze.ts --file ./patient-notes.txt --output-path ./analysis-results.json

# Run IMHI benchmark evaluation (requires Python bridge)
ts-node src/scripts/mental-llama-analyze.ts --imhi --model-path /path/to/model --output-path ./imhi-results
```

## Environment Variables

The following environment variables are required:

- `EMOTION_LLAMA_API_URL` - URL for the EmotionLLaMA API
- `EMOTION_LLAMA_API_KEY` - API key for EmotionLLaMA
- `FHE_KEY_PATH` - Path to FHE key file
- `FHE_CERT_PATH` - Path to FHE certificate file
- `MENTAL_LLAMA_PATH` - (Optional) Path to MentalLLaMA repository for Python bridge
- `PYTHON_PATH` - (Optional) Path to Python executable for Python bridge

## Integration with TogetherAI

To use the MentalLLaMA integration with TogetherAI:

1. Fine-tune a model on mental health data using MentalLLaMA's approach
2. Deploy the fine-tuned model on TogetherAI
3. Update the MentalLLaMA adapter to use the deployed model

## Ethical Considerations

As stated in the MentalLLaMA repository, this integration is provided for **non-clinical research only**. None of the material constitutes actual diagnosis or advice, and help-seekers should get assistance from professional psychiatrists or clinical practitioners.

## Next Steps

- [x] Add more mental health categories and patterns
- [x] Integrate with expert-written explanations
- [ ] Implement complete IMHI benchmark support
- [ ] Create visualization tools for analysis results 
