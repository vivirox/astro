/**
 * TFHE Mock Implementation
 *
 * This file provides a mock implementation of the TFHE module for development and build purposes.
 * In production, this would be replaced with the actual TFHE module.
 */

import { Buffer } from 'node:buffer'

// Mock key objects
export interface MockClientKey {
  id: string
  createdAt: number
  mockType: 'clientKey'
}

export interface MockServerKey {
  id: string
  mockType: 'serverKey'
}

export interface MockPublicKey {
  id: string
  mockType: 'publicKey'
}

// Mock encryption data
export interface MockEncryptedData {
  data: string
  keyId: string
  timestamp: number
  mockType: 'encryptedData'
}

// Parameter types
export interface TFHEParams {
  securityLevel: string
  keySize?: number
  // Other parameters can be added as needed
}

// Generic mock key interface with id property
export interface MockKey {
  id?: string
  type?: string
  [key: string]: unknown
}

/**
 * Create a client key for FHE operations
 * @param params Parameters for key generation
 * @returns A mock client key
 */
export function createClientKey(params: unknown): unknown {
  return {
    mock: true,
    type: 'clientKey',
    id: generateRandomId(),
    created: Date.now(),
    params, // Store params for potential future use
  }
}

/**
 * Create a server key from a client key
 * @param clientKey The client key to derive from
 * @returns A mock server key
 */
export function createServerKey(clientKey: unknown): unknown {
  return {
    mock: true,
    type: 'serverKey',
    clientKeyId: (clientKey as MockKey)?.id || 'unknown',
    id: generateRandomId(),
    created: Date.now(),
  }
}

/**
 * Create a public key from a client key
 * @param clientKey The client key to derive from
 * @returns A mock public key
 */
export function createPublicKey(clientKey: unknown): unknown {
  return {
    mock: true,
    type: 'publicKey',
    clientKeyId: (clientKey as MockKey)?.id || 'unknown',
    id: generateRandomId(),
    created: Date.now(),
  }
}

/**
 * Encrypt data using FHE
 * @param data Data to encrypt
 * @param key Key to use for encryption
 * @returns Mock encrypted data
 */
export function encrypt(data: string, key: unknown): unknown {
  // Include key id in mock encryption for traceability
  const keyId = (key as MockKey)?.id || 'unknown'
  return `mock-encrypted:${keyId}:${Buffer.from(data).toString('base64')}`
}

/**
 * Decrypt FHE-encrypted data
 * @param data Encrypted data
 * @param key Key to use for decryption
 * @returns Decrypted data
 */
export function decrypt(data: unknown, key: unknown): string {
  if (typeof data === 'string' && data.startsWith('mock-encrypted:')) {
    // Verify key matches the one used for encryption
    const [, keyId, base64Data] = data.split(':') // Use comma to skip unused prefix
    if ((key as MockKey)?.id && keyId !== (key as MockKey).id) {
      throw new Error('Invalid key for decryption')
    }
    return Buffer.from(base64Data, 'base64').toString()
  }
  return String(data)
}

/**
 * Helper to generate random IDs
 */
function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Perform homomorphic addition on encrypted values
 */
export function homomorphicAdd(a: unknown, b: unknown): unknown {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('Invalid encrypted values: expected string')
  }
  // Mock implementation that combines the encrypted values
  const aStr = a.replace('mock-encrypted:', '')
  const bStr = b.replace('mock-encrypted:', '')
  return `mock-encrypted:${aStr}+${bStr}`
}

/**
 * Perform homomorphic multiplication on encrypted values
 */
export function homomorphicMultiply(a: unknown, b: unknown): unknown {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('Invalid encrypted values: expected string')
  }
  // Mock implementation that combines the encrypted values
  const aStr = a.replace('mock-encrypted:', '')
  const bStr = b.replace('mock-encrypted:', '')
  return `mock-encrypted:${aStr}*${bStr}`
}

/**
 * Perform homomorphic comparison on encrypted values
 */
export function homomorphicCompare(a: unknown, b: unknown): unknown {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('Invalid encrypted values: expected string')
  }
  // Mock implementation that combines the encrypted values
  const aStr = a.replace('mock-encrypted:', '')
  const bStr = b.replace('mock-encrypted:', '')
  return `mock-encrypted:${aStr}==${bStr}`
}

// Export as default object to match the structure expected by dynamic imports
export default {
  createClientKey,
  createServerKey,
  createPublicKey,
  encrypt,
  decrypt,
  homomorphicAdd,
  homomorphicMultiply,
  homomorphicCompare,
}
