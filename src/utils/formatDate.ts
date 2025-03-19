/**
 * Formats a date string into a more readable format
 * @param dateString - The date string to format
 * @returns Formatted date string (e.g., "March 15, 2024")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
