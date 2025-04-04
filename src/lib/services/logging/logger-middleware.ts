/**
 * Logger Middleware
 *
 * Middleware for logging HTTP requests and responses to our centralized logging system.
 * This integrates with Astro's middleware system.
 */

import type { APIContext, MiddlewareHandler } from 'astro'
import { getLogger } from '@/lib/logging'
import elkService from './elk'

const logger = getLogger({ name: 'http' })

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Extract client IP address from request
 */
function getClientIp(request: Request): string {
  // Try headers that might contain the original client IP when behind a proxy
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback - this will often be the load balancer IP in production
  return 'unknown'
}

/**
 * Get user agent information
 */
function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

/**
 * Get referrer information
 */
function getReferrer(request: Request): string {
  return request.headers.get('referer') || ''
}

/**
 * HTTP logger middleware
 */
export const loggerMiddleware: MiddlewareHandler = async (context, next) => {
  const { request } = context
  const requestId = generateRequestId()
  const startTime = performance.now()
  const requestUrl = new URL(request.url)

  // Extract request details
  const method = request.method
  const path = requestUrl.pathname
  const query = requestUrl.search
  const clientIp = getClientIp(request)
  const userAgent = getUserAgent(request)
  const referrer = getReferrer(request)

  // Add request ID to headers for correlation
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  context.locals.requestId = requestId

  // Log the request
  logger.info(`${method} ${path}${query}`, {
    request: {
      id: requestId,
      method,
      path,
      query,
      clientIp,
      userAgent,
      referrer,
    },
  })

  try {
    // Process the request and get the response
    const response = await next()

    // Calculate duration
    const endTime = performance.now()
    const duration = endTime - startTime
    const responseStatus = response.status

    // Add request ID to response headers
    const newHeaders = new Headers(response.headers)
    newHeaders.set('x-request-id', requestId)

    // Log the response
    logger.info(
      `${method} ${path} - ${responseStatus} (${Math.round(duration)}ms)`,
      {
        request: {
          id: requestId,
          method,
          path,
        },
        response: {
          status: responseStatus,
          duration: Math.round(duration),
        },
      },
    )

    // Send to ELK
    elkService.log({
      level: 'info',
      message: `${method} ${path} - ${responseStatus}`,
      timestamp: new Date(),
      prefix: 'http',
      metadata: {
        request: {
          id: requestId,
          method,
          path,
          query,
          clientIp,
          userAgent,
          referrer,
        },
        response: {
          status: responseStatus,
          duration: Math.round(duration),
        },
      },
    })

    // Return the response with the added request ID header
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    })
  } catch (error) {
    // Calculate duration even if there's an error
    const endTime = performance.now()
    const duration = endTime - startTime

    // Log the error
    logger.error(`Error processing ${method} ${path}`, error, {
      request: {
        id: requestId,
        method,
        path,
        duration: Math.round(duration),
      },
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error),
    })

    // Send to ELK
    elkService.log({
      level: 'error',
      message: `Error processing ${method} ${path}`,
      timestamp: new Date(),
      prefix: 'http',
      metadata: {
        request: {
          id: requestId,
          method,
          path,
          query,
          clientIp,
          userAgent,
          referrer,
        },
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : String(error),
        duration: Math.round(duration),
      },
    })

    // Re-throw to let Astro's error handling take over
    throw error
  }
}

/**
 * API specific logger middleware with additional context
 */
export function createApiLoggerMiddleware(serviceName: string) {
  return async (context: APIContext, next: Function) => {
    const { request } = context
    const requestId = generateRequestId()
    const startTime = performance.now()
    const requestUrl = new URL(request.url)

    // Extract request details
    const method = request.method
    const path = requestUrl.pathname
    const query = requestUrl.search
    const clientIp = getClientIp(request)
    const userAgent = getUserAgent(request)

    // Additional API specific details
    const apiVersion = path.includes('/v') ? path.split('/')[2] : 'unknown'

    // Log the API request
    logger.info(`API ${serviceName} ${method} ${path}${query}`, {
      service: serviceName,
      api: {
        version: apiVersion,
        request: {
          id: requestId,
          method,
          path,
          query,
          clientIp,
          userAgent,
        },
      },
    })

    try {
      // Process the request and get the response
      const response = await next()

      // Calculate duration
      const endTime = performance.now()
      const duration = endTime - startTime
      const responseStatus = response.status

      // Log the API response
      logger.info(
        `API ${serviceName} ${method} ${path} - ${responseStatus} (${Math.round(duration)}ms)`,
        {
          service: serviceName,
          api: {
            version: apiVersion,
            request: {
              id: requestId,
              method,
              path,
            },
            response: {
              status: responseStatus,
              duration: Math.round(duration),
            },
          },
        },
      )

      // Send to ELK
      elkService.log({
        level: 'info',
        message: `API ${serviceName} ${method} ${path} - ${responseStatus}`,
        timestamp: new Date(),
        prefix: `api-${serviceName}`,
        metadata: {
          service: serviceName,
          api: {
            version: apiVersion,
            request: {
              id: requestId,
              method,
              path,
              query,
              clientIp,
              userAgent,
            },
            response: {
              status: responseStatus,
              duration: Math.round(duration),
            },
          },
        },
      })

      return response
    } catch (error) {
      // Calculate duration even if there's an error
      const endTime = performance.now()
      const duration = endTime - startTime

      // Log the API error
      logger.error(`API Error in ${serviceName} ${method} ${path}`, error, {
        service: serviceName,
        api: {
          version: apiVersion,
          request: {
            id: requestId,
            method,
            path,
            duration: Math.round(duration),
          },
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : String(error),
        },
      })

      // Send to ELK
      elkService.log({
        level: 'error',
        message: `API Error in ${serviceName} ${method} ${path}`,
        timestamp: new Date(),
        prefix: `api-${serviceName}`,
        metadata: {
          service: serviceName,
          api: {
            version: apiVersion,
            request: {
              id: requestId,
              method,
              path,
              query,
              clientIp,
              userAgent,
            },
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : String(error),
            duration: Math.round(duration),
          },
        },
      })

      // Re-throw to let API error handling take over
      throw error
    }
  }
}

export default loggerMiddleware
