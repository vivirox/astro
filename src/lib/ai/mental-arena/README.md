# MentalArena Integration

This directory contains an integration with [MentalArena](https://github.com/Scarelette/MentalArena), a self-play framework for training language models for diagnosis and treatment of mental health disorders.

## Overview

MentalArena enhances our EmotionLLaMA implementation by providing:

1. **Self-play training** - Generates domain-specific personalized data through simulated patient-therapist interactions
2. **Symptom Encoder** - Simulates realistic patients from cognitive and behavioral perspectives
3. **Symptom Decoder** - Compares diagnosed symptoms with encoded symptoms to improve treatment accuracy
4. **Synthetic Data Generation** - Creates high-quality therapeutic conversations to improve model training

## Integration Components

- `MentalArenaAdapter` - TypeScript adapter for MentalArena functionality
- `MentalArenaFactory` - Factory for creating MentalArena adapters
- `MentalArenaPythonBridge` - Bridge to execute original MentalArena Python code

## Usage

### TypeScript Implementation

```typescript
import { MentalArenaFactory } from '../lib/ai/mental-arena'

// Create adapter from environment variables
const adapter = await MentalArenaFactory.createFromEnv()

// Generate synthetic therapeutic conversations
const syntheticData = await adapter.generateSyntheticData({
  numSessions: 10,
  maxTurns: 5,
  disorders: ['anxiety', 'depression', 'ptsd']
})

// Fine-tune model using generated data
await adapter.fineTuneModel(syntheticData)
```

### Python Bridge

For more advanced features, you can use the Python bridge to interact with the original MentalArena codebase:

```typescript
import { MentalArenaPythonBridge } from '../lib/ai/mental-arena'

// Initialize the bridge
const bridge = new MentalArenaPythonBridge('/path/to/mental-arena')
await bridge.initialize()

// Generate data
await bridge.generateData({
  baseModel: 'meta-llama/Meta-Llama-3-8B',
  outputFile: './data/synthetic.jsonl',
  numSessions: 10
})

// Process data for fine-tuning
await bridge.processData({
  inputFile: './data/synthetic.jsonl',
  finetuneFile: './data/finetune.jsonl',
  baseModel: 'meta-llama/Meta-Llama-3-8B'
})
```

## Command Line Tool

A command-line tool is available for generating synthetic data:

```bash
# Generate 10 synthetic sessions using TypeScript implementation
ts-node src/scripts/mental-arena-generate.ts --num-sessions 10 --output-path ./data/synthetic.jsonl

# Generate data using Python bridge
ts-node src/scripts/mental-arena-generate.ts --use-python-bridge --model meta-llama/Meta-Llama-3-8B
```

## Environment Variables

The following environment variables are required:

- `EMOTION_LLAMA_API_URL` - URL for the EmotionLLaMA API
- `EMOTION_LLAMA_API_KEY` - API key for EmotionLLaMA
- `FHE_KEY_PATH` - Path to FHE key file
- `FHE_CERT_PATH` - Path to FHE certificate file

## Integration with TogetherAI

To use the MentalArena integration with TogetherAI:

1. Generate synthetic data using MentalArena
2. Process the data for fine-tuning
3. Upload the processed data to TogetherAI
4. Fine-tune a model using TogetherAI's fine-tuning API
5. Deploy the fine-tuned model using TogetherAI's inference API

## Next Steps

- [ ] Implement more advanced Symptom Encoder and Decoder
- [ ] Add evaluation using mental health benchmarks
- [ ] Integrate with TogetherAI fine-tuning API
- [ ] Create UI for visualizing patient-therapist interactions 
