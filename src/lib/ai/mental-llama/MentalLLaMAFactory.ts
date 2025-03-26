import { FHEService } from '../../fhe'
import { EmotionLlamaProvider } from '../providers/EmotionLlamaProvider'
import { createLogger } from '../../../utils/logger'
import { MentalLLaMAAdapter } from './MentalLLaMAAdapter'
import { MentalLLaMAPythonBridge } from './PythonBridge'

const logger = createLogger({ context: 'MentalLLaMAFactory' })

export interface MentalLLaMAConfig {
  baseUrl: string
  apiKey: string
  fheConfig: {
    keyPath: string
    certPath: string
  }
  providerConfig: {
    useExistingProvider?: boolean
    providerUrl?: string
    providerApiKey?: string
  }
  pythonConfig?: {
    pythonPath?: string
    mentalLLaMAPath?: string
  }
}

export class MentalLLaMAFactory {
  /**
   * Create a MentalLLaMA adapter with all required dependencies
   */
  static async create(config: MentalLLaMAConfig): Promise<{
    adapter: MentalLLaMAAdapter
    pythonBridge?: MentalLLaMAPythonBridge
  }> {
    try {
      // Initialize FHE service
      const fheService = new FHEService({
        keyPath: config.fheConfig.keyPath,
        certPath: config.fheConfig.certPath,
      })
      await fheService.initialize()

      // Create or use existing provider
      let provider: EmotionLlamaProvider

      if (
        config.providerConfig.useExistingProvider &&
        config.providerConfig.providerUrl &&
        config.providerConfig.providerApiKey
      ) {
        // Use existing provider
        provider = new EmotionLlamaProvider(
          config.providerConfig.providerUrl,
          config.providerConfig.providerApiKey,
          fheService,
        )
      } else {
        // Create new provider
        provider = new EmotionLlamaProvider(
          config.baseUrl,
          config.apiKey,
          fheService,
        )
      }

      // Create adapter
      const adapter = new MentalLLaMAAdapter(
        provider,
        fheService,
        config.baseUrl,
        config.apiKey,
      )

      // Create and initialize Python bridge if configured
      let pythonBridge: MentalLLaMAPythonBridge | undefined

      if (config.pythonConfig?.mentalLLaMAPath) {
        pythonBridge = new MentalLLaMAPythonBridge(
          config.pythonConfig.mentalLLaMAPath,
          config.pythonConfig.pythonPath,
        )

        // Initialize but don't wait - it can take time and we can use the adapter right away
        pythonBridge.initialize().catch((error) => {
          logger.error('Failed to initialize Python bridge', { error })
        })
      }

      return { adapter, pythonBridge }
    } catch (error) {
      logger.error('Failed to create MentalLLaMA adapter', { error })
      throw error
    }
  }

  /**
   * Create from environment variables
   */
  static async createFromEnv(): Promise<{
    adapter: MentalLLaMAAdapter
    pythonBridge?: MentalLLaMAPythonBridge
  }> {
    const requiredEnvVars = [
      'EMOTION_LLAMA_API_URL',
      'EMOTION_LLAMA_API_KEY',
      'FHE_KEY_PATH',
      'FHE_CERT_PATH',
    ]

    const missingVars = requiredEnvVars.filter(
      (varName) => !process.env[varName],
    )
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`,
      )
    }

    const mentalLLaMAPath = process.env.MENTAL_LLAMA_PATH || '/tmp/MentalLLaMA'
    const pythonPath = process.env.PYTHON_PATH || 'python'

    return MentalLLaMAFactory.create({
      baseUrl: process.env.EMOTION_LLAMA_API_URL!,
      apiKey: process.env.EMOTION_LLAMA_API_KEY!,
      fheConfig: {
        keyPath: process.env.FHE_KEY_PATH!,
        certPath: process.env.FHE_CERT_PATH!,
      },
      providerConfig: {
        useExistingProvider: false,
      },
      pythonConfig: {
        mentalLLaMAPath,
        pythonPath,
      },
    })
  }

  /**
   * Create for testing purposes
   */
  static async createForTesting(): Promise<{
    adapter: MentalLLaMAAdapter
    pythonBridge?: MentalLLaMAPythonBridge
  }> {
    // Initialize with mock services for testing
    const mockFHE = new FHEService({
      keyPath: 'test/keys/test.key',
      certPath: 'test/certs/test.cert',
    })

    const mockProvider = new EmotionLlamaProvider(
      'http://localhost:8080',
      'test-api-key',
      mockFHE,
    )

    const adapter = new MentalLLaMAAdapter(
      mockProvider,
      mockFHE,
      'http://localhost:8080',
      'test-api-key',
    )

    return { adapter }
  }
}
