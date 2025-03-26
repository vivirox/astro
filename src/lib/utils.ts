import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge class names with Tailwind CSS classes
 */
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

/**
 * Get a date key string based on the specified period
 *
 * @param dateString - ISO date string
 * @param period - The grouping period ('daily', 'weekly', or 'monthly')
 * @returns Formatted date key
 */
export function getDateKey(
  dateString: string,
  period: 'daily' | 'weekly' | 'monthly',
): string {
  const date = new Date(dateString)

  switch (period) {
    case 'daily':
      return date.toISOString().split('T')[0] // YYYY-MM-DD

    case 'weekly': {
      // Get the first day of the week (Sunday)
      const firstDay = new Date(date)
      const day = date.getDay()
      firstDay.setDate(date.getDate() - day)
      return firstDay.toISOString().split('T')[0] // YYYY-MM-DD of the week's Sunday
    }

    case 'monthly':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // YYYY-MM

    default:
      return date.toISOString().split('T')[0] // Default to daily
  }
}
