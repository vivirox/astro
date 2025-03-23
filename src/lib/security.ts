/**
 * Security Module for Therapy Chat System
 *
 * Provides encryption, Fully Homomorphic Encryption (FHE) integration, and other
 * security features required for HIPAA compliance and beyond.
 */

import { atomWithStorage } from 'jotai/utils'
import { atom } from 'jotai'
import { fheService } from './fhe'
import type { FHEOperation, HomomorphicOperationResult } from './fhe/types'
import { EncryptionMode } from './fhe/types'
import { getLogger } from './logging'
import { createHmac, randomBytes } from 'crypto'

// Initialize logger
const logger = getLogger()

// Security-related atoms
export const encryptionInitializedAtom = atom(false)
export const encryptionKeysAtom = atomWithStorage('chatEncryptionKeys', null)
export const securityLevelAtom = atomWithStorage('chatSecurityLevel', 'medium')

// Define our enhanced FHE service interface
interface EnhancedFHEService {
  initialize: (options: Record<string, unknown>) => Promise<void>
  encrypt: (message: string) => Promise<string>
  decrypt?: (encryptedMessage: string) => Promise<string>
  processEncrypted?: (
    encryptedMessage: string,
    operation: FHEOperation,
    params?: Record<string, unknown>
  ) => Promise<HomomorphicOperationResult>
  setupKeyManagement?: (options: {
    rotationPeriodDays: number
    persistKeys: boolean
  }) => Promise<string>
  getEncryptionMode?: () => string
  createVerificationToken?: (message: string) => Promise<string>
  [key: string]: unknown
}

// Cast to our enhanced interface to avoid TypeScript errors
const enhancedFHEService = fheService as unknown as EnhancedFHEService

// Secret key for signatures
const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key'

/**
 * Initialize encryption system
 * This sets up the FHE service with the appropriate security level
 */
export async function initializeEncryption(level = 'medium'): Promise<boolean> {
  try {
    const encryptionMode =
      level === 'high'
        ? EncryptionMode.FHE
        : level === 'medium'
          ? EncryptionMode.HIPAA
          : EncryptionMode.STANDARD

    await enhancedFHEService.initialize({
      mode: encryptionMode,
      keySize: level === 'high' ? 2048 : 1024,
      securityLevel: level,
      enableDebug: process.env.NODE_ENV === 'development',
    })

    // For FHE mode, also set up key management
    if (
      encryptionMode === EncryptionMode.FHE &&
      enhancedFHEService.setupKeyManagement
    ) {
      const keyId = await enhancedFHEService.setupKeyManagement({
        rotationPeriodDays: 7,
        persistKeys: true,
      })

      logger.info(`FHE initialized with key ID: ${keyId}`)
    }

    logger.info(
      `Encryption initialized successfully with mode: ${encryptionMode}`
    )
    return true
  } catch (error) {
    logger.error('Failed to initialize encryption:', error)
    return false
  }
}

/**
 * Encrypt a message using the FHE service
 */
export async function encryptMessage(message: string): Promise<string> {
  try {
    const encrypted = await enhancedFHEService.encrypt(message)
    return encrypted
  } catch (error) {
    logger.error('Encryption error:', error)
    throw error
  }
}

/**
 * Decrypt a message using the FHE service
 */
export async function decryptMessage(
  encryptedMessage: string
): Promise<string> {
  try {
    let decrypted: string

    if (enhancedFHEService.decrypt) {
      decrypted = await enhancedFHEService.decrypt(encryptedMessage)
    } else {
      // Fallback implementation if decrypt is not available
      throw new Error('Decryption not implemented')
    }

    return decrypted
  } catch (error) {
    logger.error('Decryption error:', error)
    throw error
  }
}

/**
 * Process encrypted data without decrypting
 * This is the key advantage of FHE over traditional encryption
 */
export async function processEncryptedMessage(
  encryptedMessage: string,
  operation: string,
  params?: Record<string, unknown>
): Promise<string> {
  try {
    // Map operation string to FHEOperation enum
    const fheOperation = operation.toUpperCase() as FHEOperation

    if (!enhancedFHEService.processEncrypted) {
      throw new Error('FHE processing not implemented')
    }

    const result = await enhancedFHEService.processEncrypted(
      encryptedMessage,
      fheOperation,
      params
    )

    // Convert result to string format for return
    return result.result || JSON.stringify(result)
  } catch (error) {
    logger.error('FHE operation error:', error)
    throw error
  }
}

/**
 * Create a verification token for message integrity
 */
export async function createVerificationToken(
  message: string
): Promise<string> {
  try {
    if (enhancedFHEService.createVerificationToken) {
      return await enhancedFHEService.createVerificationToken(message)
    }

    // Fallback implementation if the method doesn't exist
    const timestamp = Date.now().toString()
    const data = `${message}:${timestamp}`
    return createSignature(data) + '.' + timestamp
  } catch (error) {
    logger.error('Verification token generation error:', error)
    throw error
  }
}

/**
 * Generate a secure session key
 */
export function generateSecureSessionKey(): string {
  // Use a proper CSPRNG
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
}

/**
 * HIPAA Security Helper Functions
 */

/**
 * Generate audit log entry for HIPAA compliance
 */
export function logSecurityEvent(
  eventType:
    | 'access'
    | 'message'
    | 'login'
    | 'logout'
    | 'error'
    | 'therapy_chat_request'
    | 'therapy_chat_response'
    | 'therapy_chat_error',
  details: Record<string, unknown>
): void {
  // Log to console in dev mode
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[SECURITY EVENT] ${eventType.toUpperCase()}:`, details)
  }

  // In production, this would securely log to a HIPAA-compliant audit system
  // Here, we're assuming this will be handled by the audit module
}

/**
 * Validate that the security meets HIPAA requirements
 */
export function validateHIPAACompliance(): {
  compliant: boolean
  issues: string[]
} {
  const issues: string[] = []
  let compliant = true

  // Check that encryption is properly initialized
  const encryptionMode = enhancedFHEService.getEncryptionMode?.() || 'none'

  if (encryptionMode === EncryptionMode.NONE) {
    issues.push('Encryption is disabled')
    compliant = false
  } else if (
    encryptionMode !== EncryptionMode.FHE &&
    encryptionMode !== EncryptionMode.HIPAA
  ) {
    issues.push('Encryption level may not meet HIPAA requirements')
    compliant = false
  }

  return { compliant, issues }
}

/**
 * Clear sensitive data from memory
 */
export function secureClear(obj: Record<string, unknown>): void {
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = ''
        } else if (typeof obj[key] === 'object') {
          secureClear(obj[key] as Record<string, unknown>)
        }
      }
    }
  }
}

/**
 * Create a secure random token
 * @param length Token length in bytes
 * @returns Hex string token
 */
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString('hex')
}

/**
 * Create a secure HMAC signature
 * @param data Data to sign
 * @returns Signature
 */
export function createSignature(data: string): string {
  return createHmac('sha256', SECRET_KEY).update(data).digest('hex')
}

/**
 * Verify a HMAC signature
 * @param data Original data
 * @param signature Signature to verify
 * @returns Whether signature is valid
 */
export function verifySignature(data: string, signature: string): boolean {
  const expectedSignature = createSignature(data)
  return expectedSignature === signature
}

/**
 * Create a secure token with encrypted payload
 * @param payload Token payload
 * @param expiresIn Expiration time in seconds
 * @returns Secure token
 */
export function createSecureToken(
  payload: Record<string, unknown>,
  expiresIn = 3600
): string {
  const tokenData = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000),
    jti: generateSecureToken(8),
  }

  const dataString = JSON.stringify(tokenData)
  const encodedData = Buffer.from(dataString).toString('base64')
  const signature = createSignature(encodedData)

  return `${encodedData}.${signature}`
}

/**
 * Verify and decode a secure token
 * @param token Token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifySecureToken(
  token: string
): Record<string, unknown> | null {
  try {
    const [encodedData, signature] = token.split('.')

    if (!encodedData || !signature) {
      return null
    }

    // Verify signature
    if (!verifySignature(encodedData, signature)) {
      return null
    }

    // Decode payload
    const dataString = Buffer.from(encodedData, 'base64').toString()
    const payload = JSON.parse(dataString)

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Token expired
    }

    return payload
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}
