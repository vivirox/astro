/**
 * Server utilities for handling Astro request data safely
 * These utilities help avoid issues with accessing request data in prerendered pages
 */

/**
 * Safely access Astro.request.headers in both prerendered and server contexts
 *
 * @param astro - The Astro global object
 * @param headerName - The name of the header to retrieve
 * @param defaultValue - The default value to return if headers are not available
 * @returns The header value or default value
 */
export function safelyGetHeader(
  astro: any,
  headerName: string,
  defaultValue: string = '',
): string {
  // Check if we're in a server context where headers are available
  if (import.meta.env.SSR && astro.request && astro.request.headers) {
    const headerValue = astro.request.headers.get(headerName)
    return headerValue || defaultValue
  }

  // In prerendered pages, return the default value
  return defaultValue
}

/**
 * Safely get all headers from a request
 *
 * @param astro - The Astro global object
 * @returns Object with header values or empty object in prerendered context
 */
export function safelyGetHeaders(astro: any): Record<string, string> {
  // Only try to access headers in SSR context
  if (import.meta.env.SSR && astro.request && astro.request.headers) {
    const headers: Record<string, string> = {}

    // Convert headers to a plain object
    astro.request.headers.forEach((value: string, key: string) => {
      headers[key.toLowerCase()] = value
    })

    return headers
  }

  // Return empty object for prerendered pages
  return {}
}

/**
 * Check if the current request is running in SSR mode
 *
 * @returns boolean indicating if we're in SSR mode
 */
export function isSSR(): boolean {
  return import.meta.env.SSR === true
}

/**
 * Get client IP address safely
 *
 * @param astro - The Astro global object
 * @returns The client IP or empty string
 */
export function getClientIP(astro: any): string {
  if (!import.meta.env.SSR) return ''

  return (
    safelyGetHeader(astro, 'x-forwarded-for') ||
    safelyGetHeader(astro, 'x-real-ip') ||
    safelyGetHeader(astro, 'cf-connecting-ip') ||
    ''
  )
}
