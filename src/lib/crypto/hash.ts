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
