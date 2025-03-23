/**
 * Format a date string into a readable format
 * @param dateString The date string to format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
