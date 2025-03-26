/**
 * Utility functions for the Therapy Chat System
 */

/**
 * Generate a unique ID string
 * @returns A unique ID string
 */
export function generateId(): string {
  return `id_${Math.random()
    .toString(36)
    .substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
}
