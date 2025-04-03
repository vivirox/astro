/**
 * Generates a SHA-256 hash of the input string
 * @param input - The string to hash
 * @returns The hex string of the hash
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generates a secure random string of specified length
 * @param length - The length of the random string
 * @returns The random string
 */
export function generateRandomString(length: number): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

/**
 * Crypto utilities for generating secure hashes
 */

/**
 * Generate a secure hash from a string
 *
 * Uses the Web Crypto API to create a SHA-256 hash
 *
 * @param data String data to hash
 * @returns Hex-encoded hash string
 */
export async function generateHash(data: string): Promise<string> {
  try {
    // Convert string to buffer
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)

    // Generate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)

    // Convert to hex string
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch (error) {
    // Fallback to simple hash if crypto not available
    console.warn('Web Crypto API not available, using fallback hash method')
    return fallbackHash(data)
  }
}

/**
 * Simple fallback hash function when Web Crypto is not available
 * Not cryptographically secure, but better than nothing for rate limiting
 */
function fallbackHash(str: string): string {
  let hash = 0

  if (str.length === 0) {
    return hash.toString(16)
  }

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash &= hash // Convert to 32bit integer
  }

  // Add timestamp to make it harder to reverse
  const timestamp = Date.now().toString(36)

  return hash.toString(16) + timestamp
}
