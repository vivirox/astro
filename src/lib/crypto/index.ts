/**
 * Crypto module for encryption, key management, and key rotation
 * Implements HIPAA-compliant encryption and key management
 */

export { Encryption } from "./encryption";
export { KeyRotationManager } from "./keyRotation";
export { KeyStorage } from "./keyStorage";
export { ScheduledKeyRotation } from "./scheduledRotation";

// Export a convenience function for creating a complete crypto system
import { Encryption } from "./encryption";
import { KeyRotationManager } from "./keyRotation";
import { KeyStorage } from "./keyStorage";
import { ScheduledKeyRotation } from "./scheduledRotation";
import { createCryptoSystem } from "./cryptoSystem";
import { CryptoSystem } from "./types";

/**
 * Options for creating a crypto system
 */
export interface CryptoSystemOptions {
  namespace?: string;
  useSecureStorage?: boolean;
  keyRotationDays?: number;
  enableScheduledRotation?: boolean;
  rotationCheckIntervalMs?: number;
}

/**
 * Creates a complete crypto system with encryption, key storage, and rotation
 * @param options - Configuration options
 * @returns Object containing all crypto components
 */
export function createCryptoSystem(options: CryptoSystemOptions = {}) {
  const keyStorage = new KeyStorage({
    namespace: options.namespace || "app",
    useSecureStorage: options.useSecureStorage || false,
  });

  const keyRotationManager = new KeyRotationManager(
    options.keyRotationDays || 90,
  );

  let scheduledRotation: ScheduledKeyRotation | null = null;

  // Set up scheduled rotation if enabled
  if (options.enableScheduledRotation) {
    scheduledRotation = new ScheduledKeyRotation({
      namespace: options.namespace || "app",
      useSecureStorage: options.useSecureStorage || false,
      checkIntervalMs: options.rotationCheckIntervalMs || 60 * 60 * 1000, // Default: 1 hour
      onRotation: (oldKeyId, newKeyId) => {
        console.log(`Key rotated: ${oldKeyId} -> ${newKeyId}`);
      },
      onError: (error) => {
        console.error("Rotation error:", error);
      },
    });

    // Start the scheduled rotation
    scheduledRotation.start();
  }

  return {
    encryption: Encryption,
    keyStorage,
    keyRotationManager,
    scheduledRotation,

    /**
     * Encrypts data with automatic key management
     * @param data - Data to encrypt
     * @param purpose - Purpose of the encryption
     * @returns Encrypted data
     */
    async encrypt(data: string, purpose: string): Promise<string> {
      // Get or create a key for the purpose
      const keys = await keyStorage.listKeys(purpose);
      let keyId: string;
      let key: string;
      let keyData: any;

      if (keys.length === 0) {
        // No key exists, create one
        const result = await keyStorage.generateKey(purpose);
        keyId = result.keyId;
        key = result.keyData.key;
        keyData = result.keyData;
      } else {
        // Use the first key found
        keyId = keys[0];
        keyData = await keyStorage.getKey(keyId);
        if (!keyData) {
          throw new Error(`Key data for ID ${keyId} not found`);
        }
        key = keyData.key;
      }

      // Encrypt the data
      const encrypted = Encryption.encrypt(data, key, keyData.version);

      // Return the encrypted data with the key ID
      return `${keyId}:${encrypted}`;
    },

    /**
     * Decrypts data with automatic key management
     * @param encryptedData - Data to decrypt
     * @returns Decrypted data
     */
    async decrypt(encryptedData: string): Promise<string> {
      // Extract key ID and encrypted content
      const [keyId, ...encryptedParts] = encryptedData.split(":");
      const encryptedContent = encryptedParts.join(":");

      // Get the key
      const keyData = await keyStorage.getKey(keyId);

      if (!keyData) {
        throw new Error(`Key with ID ${keyId} not found`);
      }

      // Decrypt the data
      return Encryption.decrypt(encryptedContent, keyData.key);
    },

    /**
     * Rotates keys that need rotation based on expiration
     * @returns Array of rotated key IDs
     */
    async rotateExpiredKeys(): Promise<string[]> {
      const rotatedKeys: string[] = [];
      const allKeys = await keyStorage.listKeys();

      for (const keyId of allKeys) {
        const keyData = await keyStorage.getKey(keyId);

        if (!keyData) continue;

        // Check if key needs rotation
        if (keyData.expiresAt && keyData.expiresAt <= Date.now()) {
          const rotatedKey = await keyStorage.rotateKey(keyId);

          if (rotatedKey) {
            rotatedKeys.push(rotatedKey.keyId);
          }
        }
      }

      return rotatedKeys;
    },

    /**
     * Stops the scheduled key rotation if it was enabled
     */
    stopScheduledRotation(): void {
      if (scheduledRotation) {
        scheduledRotation.stop();
      }
    },
  };
}

export default {
  Encryption,
  KeyRotationManager,
  KeyStorage,
  ScheduledKeyRotation,
  createCryptoSystem,
  CryptoSystem,
};
