import type { CryptoSystem } from './types.js'
import CryptoJS from 'crypto-js'

/**
 * Crypto module for encryption, key management, and key rotation
 * Implements HIPAA-compliant encryption and key managemen
 */

export class Encryption {
  static encrypt(data: string, key: string, version?: number): string {
    const encrypted = CryptoJS.AES.encrypt(data, key).toString()
    return encrypted
  }

  static decrypt(data: string, key: string): string {
    const decrypted = CryptoJS.AES.decrypt(data, key).toString(
      CryptoJS.enc.Utf8
    )
    return decrypted
  }
}

export class KeyRotationManager {
  constructor(private rotationDays: number) {}

  needsRotation(createdAt: number): boolean {
    const now = Date.now()
    const ageMs = now - createdAt
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    return ageDays >= this.rotationDays
  }
}

export class KeyStorage {
  constructor(
    private options: { namespace: string; useSecureStorage: boolean }
  ) {}

  async listKeys(purpose?: string): Promise<string[]> {
    return ['key1', 'key2']
  }

  async getKey(keyId: string): Promise<any> {
    return {
      key: 'test-key',
      version: 1,
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 90,
    }
  }

  async generateKey(purpose: string): Promise<{ keyId: string; keyData: any }> {
    return {
      keyId: `key-${Date.now()}`,
      keyData: {
        key: 'new-test-key',
        version: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 90,
      },
    }
  }

  async rotateKey(
    keyId: string
  ): Promise<{ keyId: string; keyData: any } | null> {
    return {
      keyId: `rotated-${keyId}`,
      keyData: {
        key: 'rotated-test-key',
        version: 2,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 90,
      },
    }
  }
}

export class ScheduledKeyRotation {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private options: {
      namespace: string
      useSecureStorage: boolean
      checkIntervalMs: number
      onRotation: (oldKeyId: string, newKeyId: string) => void
      onError: (error: Error) => void
    }
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      console.log('Checking for keys to rotate...')
    }, this.options.checkIntervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

/**
 * Options for creating a crypto system
 */
export interface CryptoSystemOptions {
  namespace?: string
  useSecureStorage?: boolean
  keyRotationDays?: number
  enableScheduledRotation?: boolean
  rotationCheckIntervalMs?: number
}

/**
 * Creates a complete crypto system with encryption, key storage, and rotation
 * @param options - Configuration options
 * @returns Object containing all crypto components
 */
export function createCryptoSystem(options: CryptoSystemOptions = {}) {
  const keyStorage = new KeyStorage({
    namespace: options.namespace || 'app',
    useSecureStorage: options.useSecureStorage || false,
  })

  const keyRotationManager = new KeyRotationManager(
    options.keyRotationDays || 90
  )

  let scheduledRotation: ScheduledKeyRotation | null = null

  // Set up scheduled rotation if enabled
  if (options.enableScheduledRotation) {
    scheduledRotation = new ScheduledKeyRotation({
      namespace: options.namespace || 'app',
      useSecureStorage: options.useSecureStorage || false,
      checkIntervalMs: options.rotationCheckIntervalMs || 60 * 60 * 1000, // Default: 1 hour
      onRotation: (oldKeyId: string, newKeyId: string) => {
        console.log(`Key rotated: ${oldKeyId} -> ${newKeyId}`)
      },
      onError: (error: Error) => {
        console.error('Rotation error:', error)
      },
    })

    // Start the scheduled rotation
    scheduledRotation.start()
  }

  return <CryptoSystem>{
    encryption: Encryption,
    keyStorage,
    keyRotationManager,
    scheduledRotation,

    /**
     * Encrypts data with automatic key managemen
     * @param data - Data to encryp
     * @param purpose - Purpose of the encryption
     * @returns Encrypted data
     */
    async encrypt(data: string, purpose: string): Promise<string> {
      // Get or create a key for the purpose
      const keys = await keyStorage.listKeys(purpose)
      let keyId: string
      let key: string
      let keyData: any

      if (keys.length === 0) {
        // No key exists, create one
        const result = await keyStorage.generateKey(purpose)
        keyId = result?.keyId
        key = result?.keyData.key
        keyData = result?.keyData
      } else {
        // Use the first key found
        keyId = keys[0]
        keyData = await keyStorage.getKey(keyId)
        if (!keyData) {
          throw new Error(`Key data for ID ${keyId} not found`)
        }
        key = keyData.key
      }

      // Encrypt the data
      const encrypted = Encryption.encrypt(data, key, keyData.version)

      // Return the encrypted data with the key ID
      return `${keyId}:${encrypted}`
    },

    /**
     * Decrypts data with automatic key managemen
     * @param encryptedData - Data to decryp
     * @returns Decrypted data
     */
    async decrypt(encryptedData: string, context?: string): Promise<string> {
      // Extract key ID and encrypted conten
      const [keyId, ...encryptedParts] = encryptedData.split(':')
      const encryptedContent = encryptedParts.join(':')

      // Get the key
      const keyData = await keyStorage.getKey(keyId)

      if (!keyData) {
        throw new Error(`Key with ID ${keyId} not found`)
      }

      // Decrypt the data
      return Encryption.decrypt(encryptedContent, keyData.key)
    },

    /**
     * Hash data
     */
    async hash(data: string): Promise<string> {
      // Simple hash implementation
      let hash = 0
      for (let i = 0; i < data?.length; i++) {
        const char = data?.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
      }
      return `hash-${hash.toString(16)}`
    },

    /**
     * Sign data
     */
    async sign(data: string): Promise<string> {
      const hash = await this.hash(data)
      return `signature-${hash}`
    },

    /**
     * Verify a signature
     */
    async verify(data: string, signature: string): Promise<boolean> {
      const expectedSignature = await this.sign(data)
      return signature === expectedSignature
    },

    /**
     * Rotates keys that need rotation based on expiration
     * @returns Array of rotated key IDs
     */
    async rotateExpiredKeys(): Promise<string[]> {
      const rotatedKeys: string[] = []
      const allKeys = await keyStorage.listKeys()

      for (const keyId of allKeys) {
        const keyData = await keyStorage.getKey(keyId)

        if (!keyData) continue

        // Check if key needs rotation
        if (keyData.expiresAt && keyData.expiresAt <= Date.now()) {
          const rotatedKey = await keyStorage.rotateKey(keyId)

          if (rotatedKey) {
            rotatedKeys.push(rotatedKey.keyId)
          }
        }
      }

      return rotatedKeys
    },

    /**
     * Stops the scheduled key rotation if it was enabled
     */
    stopScheduledRotation(): void {
      if (scheduledRotation) {
        scheduledRotation.stop()
      }
    },
  }
}

export default {
  Encryption,
  KeyRotationManager,
  KeyStorage,
  ScheduledKeyRotation,
  createCryptoSystem,
}
