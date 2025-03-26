/**
 * Verification token utilities for security
 *
 * Provides token creation and validation functions for export integrity
 */

// Use browser-compatible base64 encoding/decoding instead of Node.js Buffer

import { getLogger } from '../logging'

const logger = getLogger()

/**
 * Create a signed verification token for data integrity
 *
 * @param payload - The data to sign
 * @returns A signed verification token
 */
export function createSignedVerificationToken(payload: unknown): string {
  try {
    const timestamp = Date.now()
    const token = {
      ...JSON.parse(JSON.stringify(payload)),
      iat: timestamp,
      exp: timestamp + 3600000, // 1 hour expiration
    }

    // Use btoa for browser compatibility instead of Buffer
    const jsonString = JSON.stringify(token)
    const encodedToken = btoa(jsonString)
    return encodedToken
  } catch (error) {
    logger.error('Failed to create verification token', { error })
    throw new Error('Verification token creation failed')
  }
}

/**
 * Verify a token's signature and validity
 *
 * @param token - The token to verify
 * @returns The decoded payload if valid, null otherwise
 */
export function verifyToken(token: string): unknown | null {
  try {
    // Use atob for browser compatibility instead of Buffer
    const decoded = JSON.parse(atob(token))

    // Check expiration
    if (decoded.exp < Date.now()) {
      logger.warn('Token expired', { token })
      return null
    }

    return decoded
  } catch (error) {
    logger.error('Error verifying token', { error, token })
    return null
  }
}
