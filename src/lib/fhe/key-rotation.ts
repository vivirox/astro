/**
 * FHE Key Rotation Service
 *
 * Manages the secure rotation of encryption keys for the FHE system.
 * This ensures compliance with security best practices and HIPAA requirements.
 */

import { getLogger } from '../logging'
import type { TFHEKeyPair, KeyManagementOptions } from './types'

// Get logger
const logger = getLogger()

/**
 * Default key management options
 */
const DEFAULT_OPTIONS: KeyManagementOptions = {
  rotationPeriodDays: 30,
  persistKeys: true,
  storagePrefix: 'fhe_key_',
}

/**
 * FHE Key Rotation Service
 */
export class KeyRotationService {
  private static instance: KeyRotationService
  private options: KeyManagementOptions
  private activeKeyId: string | null = null
  private keyRotationTimers = new Map<string, NodeJS.Timeout>()
  private isClient = false
  private isServer = false

  /**
   * Private constructor for singleton pattern
   */
  private constructor(options?: Partial<KeyManagementOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    // Detect environmen
    this.isClient = typeof window !== 'undefined'
    this.isServer = typeof window === 'undefined'

    logger.info(
      `Key Rotation Service initialized in ${this.isServer ? 'server' : 'client'} environment`
    )
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    options?: Partial<KeyManagementOptions>
  ): KeyRotationService {
    if (!KeyRotationService.instance) {
      KeyRotationService.instance = new KeyRotationService(options)
    }
    return KeyRotationService.instance
  }

  /**
   * Initialize the key rotation service
   */
  public async initialize(): Promise<void> {
    try {
      // Load existing keys
      await this.loadKeys()

      // Check if we need to generate a new key
      if (!this.activeKeyId) {
        await this.rotateKeys()
      }

      logger.info('Key rotation service initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize key rotation service', error)
      throw new Error(
        `Key rotation initialization error: ${(error as Error).message}`
      )
    }
  }

  /**
   * Register a key for rotation
   */
  public registerKey(keyId: string, expiryTime: number): void {
    if (this.keyRotationTimers.has(keyId)) {
      return // Already registered
    }

    const now = Date.now()
    const timeToExpiry = Math.max(0, expiryTime - now)

    // Schedule key rotation
    if (this.isServer) {
      // For server environments, use normal timeouts
      const timer = setTimeout(() => {
        this.rotateKeys().catch((err) => {
          logger.error(`Failed to rotate key ${keyId}`, err)
        })
      }, timeToExpiry)

      this.keyRotationTimers.set(keyId, timer)
      logger.info(
        `Scheduled key ${keyId} for rotation in ${Math.round(timeToExpiry / (1000 * 60 * 60 * 24))} days`
      )
    } else if (this.isClient) {
      // For client environments, check periodically
      this.scheduleClientRotationCheck(keyId, expiryTime)
    }
  }

  /**
   * Schedule a periodic check for key rotation in the client
   */
  private scheduleClientRotationCheck(keyId: string, expiryTime: number): void {
    // In the client, we check daily if the key needs rotation
    const checkInterval = 24 * 60 * 60 * 1000 // 24 hours

    const timer = setInterval(() => {
      const now = Date.now()
      if (now >= expiryTime) {
        this.rotateKeys().catch((err) => {
          logger.error(`Failed to rotate key ${keyId}`, err)
        })

        // Clear the interval after rotation
        clearInterval(timer)
        this.keyRotationTimers.delete(keyId)
      }
    }, checkInterval)

    this.keyRotationTimers.set(keyId, timer)
  }

  /**
   * Generate a new key pair and set it as active
   */
  public async rotateKeys(): Promise<string> {
    try {
      logger.info('Rotating encryption keys')

      // Generate a new key ID
      const keyId = this.generateKeyId()

      // Calculate expiry time
      const now = Date.now()
      const rotationMs = this.options.rotationPeriodDays! * 24 * 60 * 60 * 1000
      const expiryTime = now + rotationMs

      // In a real implementation, this would generate actual FHE keys
      // For this example, we'll create a placeholder key pair
      const keyPair: TFHEKeyPair = {
        id: keyId,
        publicKey: `pk_${keyId}`,
        privateKeyEncrypted: `encrypted_sk_${keyId}`,
        created: now,
        expires: expiryTime,
        version: '1.0',
      }

      // Store the key
      await this.storeKey(keyPair)

      // Set as active key
      this.activeKeyId = keyId

      // Schedule rotation
      this.registerKey(keyId, expiryTime)

      logger.info(`Key rotation completed successfully. New key ID: ${keyId}`)
      return keyId
    } catch (error) {
      logger.error('Failed to rotate keys', error)
      throw new Error(`Key rotation error: ${(error as Error).message}`)
    }
  }

  /**
   * Store a key pair securely
   */
  private async storeKey(keyPair: TFHEKeyPair): Promise<void> {
    if (!this.options.persistKeys) {
      return
    }

    try {
      const storageKey = `${this.options.storagePrefix}${keyPair.id}`

      if (this.isClient) {
        // For client environments, use localStorage
        localStorage.setItem(storageKey, JSON.stringify(keyPair))
      } else {
        // For server environments, this would use a secure database
        // For this example, we'll just log the action
        logger.info(`Server would store key ${keyPair.id} in secure storage`)
      }
    } catch (error) {
      logger.error(`Failed to store key ${keyPair.id}`, error)
      throw new Error(`Key storage error: ${(error as Error).message}`)
    }
  }

  /**
   * Load existing keys from storage
   */
  private async loadKeys(): Promise<void> {
    if (!this.options.persistKeys) {
      return
    }

    try {
      if (this.isClient) {
        // In client environments, search localStorage for keys
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(this.options.storagePrefix!)) {
            try {
              const keyPair = JSON.parse(
                localStorage.getItem(key)!
              ) as TFHEKeyPair

              // Check if key is not expired
              if (keyPair.expires > Date.now()) {
                // Set as active key if not yet set or if this key is newer
                if (
                  !this.activeKeyId ||
                  keyPair.created >
                    (
                      JSON.parse(
                        localStorage.getItem(
                          `${this.options.storagePrefix}${this.activeKeyId}`
                        )!
                      ) as TFHEKeyPair
                    ).created
                ) {
                  this.activeKeyId = keyPair.id
                }

                // Schedule rotation
                this.registerKey(keyPair.id, keyPair.expires)
              } else {
                // Remove expired key
                localStorage.removeItem(key)
              }
            } catch (e) {
              logger.warn(`Failed to parse key ${key}`, e)
              // Continue processing other keys
            }
          }
        }
      } else {
        // For server environments, this would load from a secure database
        logger.info('Server would load keys from secure storage')
      }

      if (this.activeKeyId) {
        logger.info(`Loaded active key: ${this.activeKeyId}`)
      } else {
        logger.info('No active keys found, will generate new key')
      }
    } catch (error) {
      logger.error('Failed to load keys', error)
      throw new Error(`Key loading error: ${(error as Error).message}`)
    }
  }

  /**
   * Get the active key ID
   */
  public getActiveKeyId(): string | null {
    return this.activeKeyId
  }

  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    // Simple implementation using timestamp and random values
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `${timestamp}-${random}`
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Clear all timers
    for (const timer of this.keyRotationTimers.values()) {
      clearTimeout(timer)
      clearInterval(timer)
    }

    this.keyRotationTimers.clear()
    logger.info('Key rotation service disposed')
  }
}

// Export singleton instance
export const keyRotationService = KeyRotationService.getInstance()

export default keyRotationService
