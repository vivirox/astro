import { defineMiddleware } from 'astro:middleware'
import { getLogger } from '../logging'

// Initialize logger
const logger = getLogger({ prefix: 'rate-limit' })

/**
 * Simple pass-through middleware for development
 * In a production environment, this would implement actual rate limiting
 */
export const enhancedRateLimitMiddleware = defineMiddleware(
  async ({ request }, next) => {
    // Skip during static generation or for non-API routes
    if (
      !request.headers ||
      request.url.includes('file:///') ||
      !new URL(request.url).pathname.startsWith('/api/')
    ) {
      return next()
    }

    try {
      // Log the request
      logger.info(
        `Rate limiting API request to ${new URL(request.url).pathname}`,
      )

      // Get response from next middleware
      const response = await next()

      // Add nominal rate limit headers
      response.headers.set('X-RateLimit-Limit', '1000')
      response.headers.set('X-RateLimit-Remaining', '999')
      response.headers.set('X-RateLimit-Reset', (Date.now() + 60000).toString())

      return response
    } catch (error) {
      // Log any errors and continue
      logger.error('Error in rate limiting:', { error })
      return next()
    }
  },
)
