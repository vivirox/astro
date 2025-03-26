import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { getLogger } from '../../logging'

// Initialize logger
const logger = getLogger()

/**
 * Bridge to interact with MentalLLaMA Python code
 */
export class MentalLLaMAPythonBridge {
  private mentalLLaMAPath: string
  private pythonPath: string

  constructor(mentalLLaMAPath: string, pythonPath: string = 'python') {
    this.mentalLLaMAPath = mentalLLaMAPath
    this.pythonPath = pythonPath
  }

  /**
   * Initialize the MentalLLaMA environment
   * - Clone repo if not exists
   * - Install dependencies
   */
  async initialize(): Promise<void> {
    logger.info('Initializing MentalLLaMA Python environment')

    try {
      // Check if directory exists
      try {
        await fs.access(this.mentalLLaMAPath)
      } catch {
        // Clone repository if it doesn't exist
        logger.info('Cloning MentalLLaMA repository', {
          path: this.mentalLLaMAPath,
        })
        await this.executeCommand('git', [
          'clone',
          'https://github.com/SteveKGYang/MentalLLaMA.git',
          this.mentalLLaMAPath,
        ])
      }

      // Install requirements
      logger.info('Installing MentalLLaMA dependencies')
      // MentalLLaMA doesn't have a requirements.txt, so we need to install manually
      await this.executeCommand(this.pythonPath, [
        '-m',
        'pip',
        'install',
        'torch',
        'transformers',
        'pandas',
        'sklearn',
        'evaluate',
      ])

      // Try to install BARTScore (optional)
      try {
        await this.executeCommand('git', [
          'clone',
          'https://github.com/neulab/BARTScore.git',
          path.join(this.mentalLLaMAPath, 'src', 'BARTScore'),
        ])
      } catch (error) {
        logger.warn('Failed to clone BARTScore', { error })
      }

      logger.info('MentalLLaMA Python environment initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize MentalLLaMA Python environment', {
        error,
      })
      throw error
    }
  }

  /**
   * Run the IMHI benchmark evaluation
   */
  async runIMHIEvaluation(params: {
    modelPath: string
    batchSize?: number
    outputPath: string
    testDataset: 'IMHI' | 'IMHI-completion' | 'expert'
    isLlama?: boolean
  }): Promise<string> {
    logger.info('Running IMHI benchmark evaluation', { params })

    const args = [
      path.join(this.mentalLLaMAPath, 'src', 'IMHI.py'),
      '--model_path',
      params.modelPath,
      '--model_output_path',
      params.outputPath,
      '--test_dataset',
      params.testDataset,
    ]

    if (params.batchSize) {
      args.push('--batch_size', params.batchSize.toString())
    }

    if (params.isLlama) {
      args.push('--llama')
    }

    // Add CUDA if available
    args.push('--cuda')

    try {
      const output = await this.executeCommandWithOutput(this.pythonPath, args)
      logger.info('IMHI evaluation complete', { outputPath: params.outputPath })
      return output
    } catch (error) {
      logger.error('Failed to run IMHI evaluation', { error })
      throw error
    }
  }

  /**
   * Label generated responses using MentalLLaMA's classifiers
   */
  async labelResponses(params: {
    modelPath: string
    dataPath: string
    outputPath: string
    calculate?: boolean
  }): Promise<string> {
    logger.info('Labeling responses with MentalLLaMA classifiers', { params })

    const args = [
      path.join(this.mentalLLaMAPath, 'src', 'label_inference.py'),
      '--model_path',
      params.modelPath,
      '--data_path',
      params.dataPath,
      '--data_output_path',
      params.outputPath,
    ]

    if (params.calculate) {
      args.push('--calculate')
    }

    // Add CUDA if available
    args.push('--cuda')

    try {
      const output = await this.executeCommandWithOutput(this.pythonPath, args)
      logger.info('Response labeling complete', {
        outputPath: params.outputPath,
      })
      return output
    } catch (error) {
      logger.error('Failed to label responses', { error })
      throw error
    }
  }

  /**
   * Evaluate the quality of generated explanations
   */
  async evaluateExplanationQuality(params: {
    generatedDirName: string
    scoreMethod: 'bart_score' | 'GPT3_score' | 'bert_score' | 'bleu' | 'rouge'
  }): Promise<string> {
    logger.info('Evaluating explanation quality', { params })

    const args = [
      path.join(this.mentalLLaMAPath, 'src', 'score.py'),
      '--gen_dir_name',
      params.generatedDirName,
      '--score_method',
      params.scoreMethod,
    ]

    // Add CUDA if available
    args.push('--cuda')

    try {
      const output = await this.executeCommandWithOutput(this.pythonPath, args)
      logger.info('Explanation quality evaluation complete')
      return output
    } catch (error) {
      logger.error('Failed to evaluate explanation quality', { error })
      throw error
    }
  }

  /**
   * Load test data from MentalLLaMA
   */
  async loadTestData(
    datasetType: 'instruction' | 'complete' | 'expert',
  ): Promise<
    Record<
      string,
      {
        texts: string[]
        labels: string[]
      }
    >
  > {
    logger.info('Loading MentalLLaMA test data', { datasetType })

    let dataPath: string
    if (datasetType === 'instruction') {
      dataPath = path.join(
        this.mentalLLaMAPath,
        'test_data',
        'test_instruction',
      )
    } else if (datasetType === 'complete') {
      dataPath = path.join(this.mentalLLaMAPath, 'test_data', 'test_complete')
    } else {
      dataPath = path.join(
        this.mentalLLaMAPath,
        'human_evaluation',
        'test_instruction_expert',
      )
    }

    try {
      const datasets: Record<string, { texts: string[]; labels: string[] }> = {}

      // List files in the directory
      const files = await fs.readdir(dataPath)

      for (const file of files) {
        if (file.endsWith('.csv')) {
          const filePath = path.join(dataPath, file)
          const content = await fs.readFile(filePath, 'utf-8')

          // Parse CSV (simple implementation, might need a CSV parser for complex cases)
          const lines = content
            .split('\n')
            .filter((line) => line.trim().length > 0)
          const header = lines[0].split(',')
          const queryIndex = header.indexOf('query')
          const labelIndex = header.indexOf('gpt-3.5-turbo')

          if (queryIndex >= 0 && labelIndex >= 0) {
            const texts: string[] = []
            const labels: string[] = []

            for (let i = 1; i < lines.length; i++) {
              const columns = this.parseCSVLine(lines[i])
              if (columns.length > Math.max(queryIndex, labelIndex)) {
                texts.push(columns[queryIndex])
                labels.push(columns[labelIndex])
              }
            }

            const datasetName = file.split('.')[0]
            datasets[datasetName] = { texts, labels }
          }
        }
      }

      logger.info('Test data loaded successfully', {
        datasetCount: Object.keys(datasets).length,
      })
      return datasets
    } catch (error) {
      logger.error('Failed to load test data', { error })
      throw error
    }
  }

  /**
   * Parse a CSV line, handling quoted strings properly
   * @private
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }

    result.push(current)
    return result
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
