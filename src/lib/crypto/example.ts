/**
 * Example usage of the crypto system
 * This file demonstrates how to use the encryption, key storage, and rotation features
 */

import { createCryptoSystem, ScheduledKeyRotation } from './index'
import { KeyStorage } from './keyStorage'

/**
 * Example: Basic encryption and decryption
 */
async function basicEncryptionExample() {
  // Create a crypto system
  const crypto = createCryptoSystem({
    namespace: 'example',
    useSecureStorage: true,
    keyRotationDays: 90,
  })

  // Encrypt some data
  const sensitiveData = 'This is sensitive patient information'
  const encrypted = await crypto.encrypt(sensitiveData)

  console.log('Encrypted data:', encrypted)

  // Decrypt the data
  const decrypted = await crypto.decrypt(encrypted)

  console.log('Decrypted data:', decrypted)

  // Verify the decryption worked correctly
  console.log('Decryption successful:', decrypted === sensitiveData)
}

/**
 * Example: Manual key rotation
 */
async function manualKeyRotationExample() {
  // Create a key storage instance
  const keyStorage = new KeyStorage({
    namespace: 'example',
    useSecureStorage: true,
  })

  // Generate a key
  const { keyId, keyData } = await keyStorage.generateKey('patient-data')

  console.log('Generated key:', keyId, 'with version:', keyData.version)

  // Rotate the key
  const rotatedKey = await keyStorage.rotateKey(keyId)

  if (rotatedKey) {
    console.log(
      'Rotated key:',
      rotatedKey.keyId,
      'with version:',
      rotatedKey.keyData.version
    )
  }

  // List all keys
  const keys = await keyStorage.listKeys()

  console.log('All keys:', keys)
}

/**
 * Example: Scheduled key rotation
 */
function scheduledKeyRotationExample() {
  // Create a scheduled rotation service
  const scheduler = new ScheduledKeyRotation({
    namespace: 'example',
    useSecureStorage: true,
    checkIntervalMs: 5 * 60 * 1000, // Check every 5 minutes
    onRotation: (oldKeyId, newKeyId) => {
      console.log(`Key rotated: ${oldKeyId} -> ${newKeyId}`)
    },
    onError: (error) => {
      console.error('Rotation error:', error)
    },
  })

  // Start the scheduler
  scheduler.start()

  console.log('Scheduled key rotation started')

  // To stop the scheduler later:
  // scheduler.stop();
}

/**
 * Example: Re-encrypting data after key rotation
 */
async function reencryptionExample() {
  // Create a crypto system
  const crypto = createCryptoSystem({
    namespace: 'example',
    useSecureStorage: true,
    keyRotationDays: 90,
  })

  // Encrypt some data
  const sensitiveData = 'This is sensitive patient information'
  const encrypted = await crypto.encrypt(sensitiveData)

  console.log('Original encrypted data:', encrypted)

  // Extract key ID from the encrypted data
  const keyId = encrypted.split(':')[0]

  // Simulate key rotation
  const keyStorage = new KeyStorage({
    namespace: 'example',
    useSecureStorage: true,
  })
  const rotatedKey = await keyStorage.rotateKey(keyId)

  if (rotatedKey) {
    console.log('Key rotated to version:', rotatedKey.keyData.version)

    // Re-encrypt the data with the new key
    const decrypted = await crypto.decrypt(encrypted)
    const reencrypted = await crypto.encrypt(decrypted)

    console.log('Re-encrypted data:', reencrypted)

    // Verify the re-encryption worked correctly
    const redecrypted = await crypto.decrypt(reencrypted)
    console.log('Re-decryption successful:', redecrypted === sensitiveData)
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('=== Basic Encryption Example ===')
  await basicEncryptionExample()

  console.log('\n=== Manual Key Rotation Example ===')
  await manualKeyRotationExample()

  console.log('\n=== Scheduled Key Rotation Example ===')
  scheduledKeyRotationExample()

  console.log('\n=== Re-encryption Example ===')
  await reencryptionExample()
}

// Uncomment to run the examples
// runExamples().catch(console.error);

export {
  basicEncryptionExample,
  manualKeyRotationExample,
  scheduledKeyRotationExample,
  reencryptionExample,
  runExamples,
}
