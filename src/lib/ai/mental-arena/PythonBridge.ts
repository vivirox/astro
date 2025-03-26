import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { getLogger } from '../../logging'

// Initialize logger
const logger = getLogger()

/**
 * Bridge to interact with MentalArena Python code
 */
export class MentalArenaPythonBridge {
  private mentalArenaPath: string
  private pythonPath: string

  constructor(mentalArenaPath: string, pythonPath: string = 'python') {
    this.mentalArenaPath = mentalArenaPath
    this.pythonPath = pythonPath
  }

  /**
   * Initialize the MentalArena environment
   * - Clone repo if not exists
   * - Install dependencies
   */
  async initialize(): Promise<void> {
    logger.info('Initializing MentalArena Python environment')

    try {
      // Check if directory exists
      try {
        await fs.access(this.mentalArenaPath)
      } catch {
        // Clone repository if it doesn't exist
        logger.info('Cloning MentalArena repository', {
          path: this.mentalArenaPath,
        })
        await this.executeCommand('git', [
          'clone',
          'https://github.com/Scarelette/MentalArena.git',
          this.mentalArenaPath,
        ])
      }

      // Install requirements
      logger.info('Installing MentalArena dependencies')
      await this.executeCommand(this.pythonPath, [
        '-m',
        'pip',
        'install',
        '-r',
        path.join(this.mentalArenaPath, 'requirements.txt'),
      ])

      logger.info('MentalArena Python environment initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize MentalArena Python environment', {
        error,
      })
      throw error
    }
  }

  /**
   * Generate data using the arena_med.py script
   */
  async generateData(params: {
    baseModel: string
    outputFile: string
    numSessions?: number
  }): Promise<string> {
    logger.info('Generating data with MentalArena', { params })

    const outputPath = params.outputFile
    const args = [
      path.join(this.mentalArenaPath, 'arena_med.py'),
      '--base_model',
      params.baseModel,
      '--output_file',
      outputPath,
    ]

    if (params.numSessions) {
      args.push('--num_sessions', params.numSessions.toString())
    }

    try {
      await this.executeCommand(this.pythonPath, args)

      // Read the generated data
      const data = await fs.readFile(outputPath, 'utf-8')
      logger.info('Data generation complete', {
        outputPath,
        dataSize: data.length,
      })

      return data
    } catch (error) {
      logger.error('Failed to generate data with MentalArena', { error })
      throw error
    }
  }

  /**
   * Process data for fine-tuning using data_process.py
   */
  async processData(params: {
    inputFile: string
    finetuneFile: string
    baseModel: string
    apiKey?: string
  }): Promise<string> {
    logger.info('Processing data for fine-tuning', { params })

    const args = [
      path.join(this.mentalArenaPath, 'data_process.py'),
      '--input_file',
      params.inputFile,
      '--finetune_file',
      params.finetuneFile,
      '--base_model',
      params.baseModel,
    ]

    if (params.apiKey) {
      args.push('--api_key', params.apiKey)
    }

    try {
      await this.executeCommand(this.pythonPath, args)

      // Read the processed data
      const data = await fs.readFile(params.finetuneFile, 'utf-8')
      logger.info('Data processing complete', {
        outputPath: params.finetuneFile,
        dataSize: data.length,
      })

      return data
    } catch (error) {
      logger.error('Failed to process data for fine-tuning', { error })
      throw error
    }
  }

  /**
   * Execute a fine-tuning job using llama_finetune.py
   */
  async fineTuneLlama(params: {
    baseModel: string
    newName: string
    dataFiles: string
    nEpochs?: number
  }): Promise<void> {
    logger.info('Initiating Llama fine-tuning', { params })

    const args = [
      path.join(this.mentalArenaPath, 'llama_finetune.py'),
      '--base_model',
      params.baseModel,
      '--new_name',
      params.newName,
      '--data_files',
      params.dataFiles,
    ]

    if (params.nEpochs) {
      args.push('--nepoch', params.nEpochs.toString())
    }

    try {
      await this.executeCommand(this.pythonPath, args)
      logger.info('Llama fine-tuning complete', { newModel: params.newName })
    } catch (error) {
      logger.error('Failed to fine-tune Llama model', { error })
      throw error
    }
  }

  /**
   * Evaluate model on biomedical QA tasks
   */
  async evaluateModel(params: {
    model: string
    dataset: 'MedQA' | 'MedMCQA' | 'PubMedQA' | 'MMLU'
    name?: string
  }): Promise<string> {
    logger.info('Evaluating model on biomedical QA', { params })

    const args = [
      path.join(this.mentalArenaPath, 'MedQA_eval.py'),
      '--model',
      params.model,
      '--dataset',
      params.dataset,
    ]

    if (params.name) {
      args.push('--name', params.name)
    }

    try {
      const result = await this.executeCommandWithOutput(this.pythonPath, args)
      logger.info('Model evaluation complete', {
        model: params.model,
        dataset: params.dataset,
      })

      return result
    } catch (error) {
      logger.error('Failed to evaluate model', { error })
      throw error
    }
  }

  /**
   * Execute a command and return its stdout
   */
  private async executeCommandWithOutput(
    command: string,
    args: string[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''

      const process = spawn(command, args)

      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`))
        }
      })

      process.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Execute a command (no output returned)
   */
  private async executeCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args)

      process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command failed with code ${code}`))
        }
      })

      process.on('error', (err) => {
        reject(err)
      })
    })
  }
}
