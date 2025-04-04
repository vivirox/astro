/**
 * Configuration for the responsive image pipeline
 */

export interface ImageConfig {
  /**
   * Default image quality setting (1-100)
   */
  defaultQuality: number

  /**
   * Default image format
   */
  defaultFormat: 'webp' | 'avif' | 'jpg' | 'png'

  /**
   * Default set of breakpoints (widths in pixels)
   */
  defaultBreakpoints: number[]

  /**
   * List of allowed external domains for image optimization
   */
  allowedDomains: string[]

  /**
   * Maximum image dimension (width or height)
   */
  maxDimension: number

  /**
   * Enable blur-up effect by default
   */
  enableBlurUp: boolean

  /**
   * Enable automatic lazy loading for images below the fold
   */
  enableLazyLoading: boolean

  /**
   * Cache duration for optimized images (in seconds)
   */
  cacheDuration: number

  /**
   * Use LQIP (Low Quality Image Placeholders) while loading
   */
  useLQIP: boolean

  /**
   * Enable responsive handling with srcset and sizes
   */
  enableResponsive: boolean
}

/**
 * Default image configuration
 */
export const defaultImageConfig: ImageConfig = {
  defaultQuality: 80,
  defaultFormat: 'webp',
  defaultBreakpoints: [320, 640, 768, 1024, 1280, 1536, 1920],
  allowedDomains: [
    'images.unsplash.com',
    'cdn.example.com',
    'assets.example.org',
    'res.cloudinary.com',
  ],
  maxDimension: 2500,
  enableBlurUp: true,
  enableLazyLoading: true,
  cacheDuration: 2592000, // 30 days in seconds
  useLQIP: true,
  enableResponsive: true,
}

/**
 * Environment-specific overrides
 * These values can be overridden with environment variables
 */
export const imageConfig: ImageConfig = {
  defaultQuality: parseInt(
    process.env.IMAGE_DEFAULT_QUALITY ||
      String(defaultImageConfig.defaultQuality),
    10,
  ),
  defaultFormat: (process.env.IMAGE_DEFAULT_FORMAT ||
    defaultImageConfig.defaultFormat) as 'webp' | 'avif' | 'jpg' | 'png',
  defaultBreakpoints: process.env.IMAGE_BREAKPOINTS
    ? process.env.IMAGE_BREAKPOINTS.split(',').map((bp) =>
        parseInt(bp.trim(), 10),
      )
    : defaultImageConfig.defaultBreakpoints,
  allowedDomains: process.env.IMAGE_ALLOWED_DOMAINS
    ? process.env.IMAGE_ALLOWED_DOMAINS.split(',').map((domain) =>
        domain.trim(),
      )
    : defaultImageConfig.allowedDomains,
  maxDimension: parseInt(
    process.env.IMAGE_MAX_DIMENSION || String(defaultImageConfig.maxDimension),
    10,
  ),
  enableBlurUp: process.env.IMAGE_ENABLE_BLUR_UP
    ? process.env.IMAGE_ENABLE_BLUR_UP === 'true'
    : defaultImageConfig.enableBlurUp,
  enableLazyLoading: process.env.IMAGE_ENABLE_LAZY_LOADING
    ? process.env.IMAGE_ENABLE_LAZY_LOADING === 'true'
    : defaultImageConfig.enableLazyLoading,
  cacheDuration: parseInt(
    process.env.IMAGE_CACHE_DURATION ||
      String(defaultImageConfig.cacheDuration),
    10,
  ),
  useLQIP: process.env.IMAGE_USE_LQIP
    ? process.env.IMAGE_USE_LQIP === 'true'
    : defaultImageConfig.useLQIP,
  enableResponsive: process.env.IMAGE_ENABLE_RESPONSIVE
    ? process.env.IMAGE_ENABLE_RESPONSIVE === 'true'
    : defaultImageConfig.enableResponsive,
}
