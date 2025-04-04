/**
 * Image Optimization Service
 * Provides utilities for programmatically optimizing images
 */

import { getImage } from 'astro:assets'
import type { ImageMetadata, GetImageResult } from 'astro'
import { imageConfig } from '../../../config/images'
import {
  calculateImageQuality,
  getBestImageFormat,
} from '../../../utils/images'

export interface OptimizeImageOptions {
  /**
   * The source image to optimize
   */
  src: ImageMetadata | string

  /**
   * Desired width of the output image
   */
  width?: number

  /**
   * Desired height of the output image
   */
  height?: number

  /**
   * Quality of the output image (1-100)
   */
  quality?: number

  /**
   * Format of the output image
   */
  format?: 'webp' | 'avif' | 'jpg' | 'png'

  /**
   * Browser's Accept header for format detection
   */
  acceptHeader?: string

  /**
   * Connection speed for quality optimization
   */
  connectionSpeed?: 'slow' | 'medium' | 'fast'
}

/**
 * A service for handling image optimization
 */
export class ImageService {
  /**
   * Optimize a single image
   * @param options Image optimization options
   * @returns Promise with the optimized image result
   */
  public async optimizeImage(
    options: OptimizeImageOptions,
  ): Promise<GetImageResult> {
    const {
      src,
      width,
      height,
      quality = imageConfig.defaultQuality,
      format: requestedFormat,
      acceptHeader = '',
      connectionSpeed = 'medium',
    } = options

    // Determine best format based on Accept header if not explicitly set
    const format = requestedFormat || getBestImageFormat(acceptHeader)

    // Calculate optimal quality based on format and connection speed
    const optimizedQuality = calculateImageQuality(format, connectionSpeed)

    // Apply configured maximum dimension limits
    const finalWidth = width
      ? Math.min(width, imageConfig.maxDimension)
      : undefined
    const finalHeight = height
      ? Math.min(height, imageConfig.maxDimension)
      : undefined

    try {
      // Process the image with Astro's image utilities
      const optimizedImage = await getImage({
        src,
        width: finalWidth,
        height: finalHeight,
        quality: quality || optimizedQuality,
        format,
      })

      return optimizedImage
    } catch (error) {
      console.error('Error optimizing image:', error)

      // Return original image as fallback if optimization fails
      if (typeof src === 'string') {
        return {
          src,
          attributes: {
            width: width?.toString(),
            height: height?.toString(),
          },
        }
      }

      throw error
    }
  }

  /**
   * Generate a full set of responsive image variations
   * @param options Base image options
   * @param breakpoints Array of width breakpoints to generate
   * @returns Promise with an array of optimized images
   */
  public async generateResponsiveSet(
    options: OptimizeImageOptions,
    breakpoints: number[] = imageConfig.defaultBreakpoints,
  ): Promise<GetImageResult[]> {
    const { height, } = options

    // Sort breakpoints in ascending order
    const sortedBreakpoints = [...breakpoints].sort((a, b) => a - b)

    // Generate an optimized image for each breakpoint
    const promises = sortedBreakpoints.map(async (breakpointWidth) => {
      // Calculate proportional height if original height is provided
      let breakpointHeight: number | undefined = undefined

      if (height && options.width) {
        const aspectRatio = options.width / height
        breakpointHeight = Math.round(breakpointWidth / aspectRatio)
      }

      return this.optimizeImage({
        ...options,
        width: breakpointWidth,
        height: breakpointHeight,
      })
    })

    return Promise.all(promises)
  }

  /**
   * Generate a full picture element configuration with multiple formats and sizes
   * @param options Base image options
   * @param breakpoints Array of width breakpoints to generate
   * @returns Promise with HTML source configurations
   */
  public async generatePictureConfig(
    options: OptimizeImageOptions,
    breakpoints: number[] = imageConfig.defaultBreakpoints,
  ): Promise<{
    sources: { srcset: string; type: string; sizes: string }[]
    img: GetImageResult
  }> {
    const { } = options

    // Generate WebP and AVIF versions if supported
    const webpSet = await this.generateResponsiveSet(
      {
        ...options,
        format: 'webp',
      },
      breakpoints,
    )

    const avifSet = await this.generateResponsiveSet(
      {
        ...options,
        format: 'avif',
      },
      breakpoints,
    )

    // Generate fallback version (jpg/png)
    const fallbackFormat = options.format === 'png' ? 'png' : 'jpg'
    const fallbackSet = await this.generateResponsiveSet(
      {
        ...options,
        format: fallbackFormat,
      },
      breakpoints,
    )

    // Generate sizes attribute
    const sizes = breakpoints
      .map((bp, i, arr) => {
        if (i === arr.length - 1) return `${bp}px`
        return `(max-width: ${arr[i + 1]}px) ${bp}px`
      })
      .join(', ')

    // Prepare sources for picture element
    const sources = [
      {
        srcset: avifSet
          .map((img, i) => `${img.src} ${breakpoints[i]}w`)
          .join(', '),
        type: 'image/avif',
        sizes,
      },
      {
        srcset: webpSet
          .map((img, i) => `${img.src} ${breakpoints[i]}w`)
          .join(', '),
        type: 'image/webp',
        sizes,
      },
      {
        srcset: fallbackSet
          .map((img, i) => `${img.src} ${breakpoints[i]}w`)
          .join(', '),
        type: fallbackFormat === 'png' ? 'image/png' : 'image/jpeg',
        sizes,
      },
    ]

    // Use the smallest fallback as the img fallback
    const img = fallbackSet[0]

    return {
      sources,
      img,
    }
  }

  /**
   * Generate a low-quality image placeholder (LQIP)
   * @param options Base image options
   * @returns Promise with the LQIP result
   */
  public async generateLQIP(
    options: OptimizeImageOptions,
  ): Promise<GetImageResult> {
    // Generate a small, blurry placeholder
    return this.optimizeImage({
      ...options,
      width: 20,
      height:
        options.height && options.width
          ? Math.round(20 * (options.height / options.width))
          : undefined,
      quality: 20,
      format: 'webp',
    })
  }
}

// Export a singleton instance
export const imageService = new ImageService()
