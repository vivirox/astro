import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID string
 *
 * @returns A unique ID string
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}
