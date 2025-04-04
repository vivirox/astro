/**
 * Image utilities for the responsive image pipeline
 */

/**
 * Calculate the aspect ratio of an image
 * @param width The width of the image
 * @param height The height of the image
 * @returns The aspect ratio as a floating point number
 */
export function calculateAspectRatio(width: number, height: number): number {
  return width / height
}

/**
 * Calculate a new height based on a target width and original aspect ratio
 * @param targetWidth The target width
 * @param originalWidth The original width
 * @param originalHeight The original height
 * @returns The new height maintaining the same aspect ratio
 */
export function calculateHeightFromWidth(
  targetWidth: number,
  originalWidth: number,
  originalHeight: number,
): number {
  const aspectRatio = calculateAspectRatio(originalWidth, originalHeight)
  return Math.round(targetWidth / aspectRatio)
}

/**
 * Calculate a new width based on a target height and original aspect ratio
 * @param targetHeight The target height
 * @param originalWidth The original width
 * @param originalHeight The original height
 * @returns The new width maintaining the same aspect ratio
 */
export function calculateWidthFromHeight(
  targetHeight: number,
  originalWidth: number,
  originalHeight: number,
): number {
  const aspectRatio = calculateAspectRatio(originalWidth, originalHeight)
  return Math.round(targetHeight * aspectRatio)
}

/**
 * Generate responsive image breakpoints based on viewport widths
 * @param minWidth The minimum width of the generated breakpoints
 * @param maxWidth The maximum width of the generated breakpoints
 * @param count The number of breakpoints to generate
 * @returns An array of breakpoint widths
 */
export function generateBreakpoints(
  minWidth: number = 320,
  maxWidth: number = 1920,
  count: number = 5,
): number[] {
  // Ensure at least 2 breakpoints
  count = Math.max(2, count)

  // Calculate step size
  const step = (maxWidth - minWidth) / (count - 1)

  // Generate breakpoints
  const breakpoints = []
  for (let i = 0; i < count; i++) {
    breakpoints.push(Math.round(minWidth + step * i))
  }

  return breakpoints
}

/**
 * Generate a sizes attribute for responsive images
 * @param breakpoints The breakpoints to use
 * @param sizes Custom sizes configuration (optional)
 * @returns A sizes attribute string for use in img or source elements
 */
export function generateSizesAttribute(
  breakpoints: number[],
  sizes?: { [breakpoint: number]: string },
): string {
  // Sort breakpoints in ascending order
  const sortedBreakpoints = [...breakpoints].sort((a, b) => a - b)

  // If custom sizes are provided, use them
  if (sizes) {
    return Object.entries(sizes)
      .map(([bp, size]) => `(max-width: ${bp}px) ${size}`)
      .join(', ')
  }

  // Default sizes attribute based on breakpoints
  return sortedBreakpoints
    .map((bp, i, arr) => {
      if (i === arr.length - 1) {
        return `${bp}px`
      }

      return `(max-width: ${arr[i + 1]}px) ${bp}px`
    })
    .join(', ')
}

/**
 * Determines the best image format based on browser support and optimization goals
 * This can be extended based on the project's specific needs
 * @param acceptHeader The Accept header from the request
 * @returns The best supported image format
 */
export function getBestImageFormat(
  acceptHeader: string = '',
): 'avif' | 'webp' | 'jpg' {
  // Check for AVIF support
  if (acceptHeader.includes('image/avif')) {
    return 'avif'
  }

  // Check for WebP support
  if (acceptHeader.includes('image/webp')) {
    return 'webp'
  }

  // Default to JPEG
  return 'jpg'
}

/**
 * Calculate the appropriate image quality based on format and connection speed
 * @param format The image format
 * @param connectionSpeed The connection speed (if available)
 * @returns An appropriate quality value for the image
 */
export function calculateImageQuality(
  format: 'avif' | 'webp' | 'jpg' | 'png',
  connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium',
): number {
  // Base quality by format
  const baseQuality = {
    avif: 70, // AVIF is more efficient at lower qualities
    webp: 75, // WebP is also quite efficient
    jpg: 80, // JPEG needs higher quality to look good
    png: 90, // PNG is lossless but we can set compression level
  }

  // Adjust quality based on connection speed
  const speedMultiplier = {
    slow: 0.8, // Lower quality for slow connections
    medium: 1.0, // Standard quality for medium connections
    fast: 1.2, // Higher quality for fast connections (capped at 100)
  }

  // Calculate and clamp quality between 30-100
  const quality = Math.round(
    baseQuality[format] * speedMultiplier[connectionSpeed],
  )
  return Math.min(100, Math.max(30, quality))
}

/**
 * Check if a URL is an external image URL
 * @param url The URL to check
 * @returns True if the URL is external
 */
export function isExternalImage(url: string): boolean {
  try {
    // Check if the URL has a protocol and host
    const urlObj = new URL(url, window.location.origin)
    return urlObj.origin !== window.location.origin
  } catch (error) {
    // If URL parsing fails, it's probably a relative path and not external
    return false
  }
}
