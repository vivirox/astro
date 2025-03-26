import { FHEService } from '../../fhe'
import { EmotionLlamaProvider } from '../providers/EmotionLlamaProvider'
import { logger } from '../../utils/logger'
import { MentalArenaAdapter } from './MentalArenaAdapter'

export interface MentalArenaConfig {
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
}

export class MentalArenaFactory {
  /**
   * Create a MentalArena adapter with all required dependencies
   */
  static async create(config: MentalArenaConfig): Promise<MentalArenaAdapter> {
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

      // Create and return adapter
      return new MentalArenaAdapter(
        provider,
        fheService,
        config.baseUrl,
        config.apiKey,
      )
    } catch (error) {
      logger.error('Failed to create MentalArena adapter:', error)
      throw error
    }
  }

  /**
   * Create from environment variables
   */
  static async createFromEnv(): Promise<MentalArenaAdapter> {
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

    return MentalArenaFactory.create({
      baseUrl: process.env.EMOTION_LLAMA_API_URL!,
      apiKey: process.env.EMOTION_LLAMA_API_KEY!,
      fheConfig: {
        keyPath: process.env.FHE_KEY_PATH!,
        certPath: process.env.FHE_CERT_PATH!,
      },
      providerConfig: {
        useExistingProvider: false,
      },
    })
  }
}
