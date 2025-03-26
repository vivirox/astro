#!/usr/bin/env ts-node
/**
 * MentalArena Data Generation Script
 *
 * This script demonstrates how to use the MentalArena integration
 * to generate synthetic therapeutic conversations.
 *
 * Usage:
 *   ts-node mental-arena-generate.ts --num-sessions 10 --output-path ./data/synthetic.jsonl
 */

import path from 'path'
import { program } from 'commander'
import { promises as fs } from 'fs'
import {
  MentalArenaFactory,
  MentalArenaPythonBridge,
} from '../lib/ai/mental-arena'

// Parse command line arguments
program
  .option('-n, --num-sessions <number>', 'Number of sessions to generate', '10')
  .option(
    '-o, --output-path <path>',
    'Output path for generated data',
    './data/mental-arena-synthetic.jsonl',
  )
  .option('-m, --model <name>', 'Base model to use', 'llama-3-8b-instruct')
  .option('-p, --python-path <path>', 'Path to Python executable', 'python')
  .option(
    '--use-python-bridge',
    'Use Python bridge instead of TypeScript implementation',
    false,
  )
  .parse(process.argv)

const options = program.opts()

async function main() {
  console.log('🧠 MentalArena Data Generation')
  console.log('============================')
  console.log(`Generating ${options.numSessions} synthetic therapy sessions`)
  console.log(`Output path: ${options.outputPath}`)
  console.log(`Using model: ${options.model}`)

  try {
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(options.outputPath)
    await fs.mkdir(outputDir, { recursive: true })

    if (options.usePythonBridge) {
      // Use Python bridge approach
      console.log('Using Python bridge implementation')

      const mentalArenaPath = path.join(process.cwd(), 'mental-arena')
      const pythonBridge = new MentalArenaPythonBridge(
        mentalArenaPath,
        options.pythonPath,
      )

      // Initialize (clone repo if needed)
      console.log('Initializing MentalArena Python environment...')
      await pythonBridge.initialize()

      // Generate data
      console.log('Generating data with arena_med.py...')
      await pythonBridge.generateData({
        baseModel: options.model,
        outputFile: options.outputPath,
        numSessions: parseInt(options.numSessions),
      })

      console.log('Data generation complete!')
    } else {
      // Use TypeScript implementation
      console.log('Using TypeScript implementation')

      // Create MentalArena adapter
      const adapter = await MentalArenaFactory.createFromEnv()

      // Generate synthetic data
      console.log('Generating synthetic therapeutic conversations...')
      const syntheticData = await adapter.generateSyntheticData({
        numSessions: parseInt(options.numSessions),
        maxTurns: 5,
        disorders: ['anxiety', 'depression', 'ptsd', 'adhd', 'ocd'],
        outputPath: options.outputPath,
      })

      // Save data to file
      const jsonlData = syntheticData
        .map((session) => JSON.stringify(session))
        .join('\n')
      await fs.writeFile(options.outputPath, jsonlData)

      console.log(
        `Generated ${syntheticData.length} synthetic therapy sessions`,
      )
      console.log(`Data saved to ${options.outputPath}`)
    }

    console.log('✅ Data generation complete')
  } catch (error) {
    console.error('❌ Error generating data:', error)
    process.exit(1)
  }
}

main()
