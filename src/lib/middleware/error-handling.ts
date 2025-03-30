import { defineMiddleware } from 'astro:middleware'
import { getLogger } from '../logging'

const logger = getLogger()

/**
 * Middleware to handle errors and prevent information disclosure
 * This middleware sanitizes error responses to avoid leaking sensitive information
 */
export const errorHandlingMiddleware = defineMiddleware(async (context, next) => {
  try {
    // Process the request
    const response = await next()
    return response
  } catch (error) {
    // Log the full error for internal debugging
    logger.error('Unhandled error in request', {
      path: new URL(context.request.url).pathname,
      error: error instanceof Error ? error : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Determine if it's an API request
    const isApiRequest = context.request.url.includes('/api/')

    // For API requests, return a JSON error response
    if (isApiRequest) {
      return new Response(
        JSON.stringify({
          error: 'server_error',
          message: 'An unexpected error occurred',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // For non-API requests, redirect to an error page
    return context.redirect('/custom-404')
  }
})

/**
 * Sanitizes an error response to remove sensitive information
 * This function should be used in API route handlers
 */
export function sanitizeErrorResponse(error: unknown): Response {
  // Log the full error for internal debugging
  logger.error('API error', {
    error: error instanceof Error ? error : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  // Default error response
  const errorResponse = {
    error: 'server_error',
    message: 'An unexpected error occurred',
  }

  // Customize the error status and message based on error type if possible
  let status = 500
  
  if (error instanceof Error) {
    // Extract status from known error types
    if ('status' in error && typeof error.status === 'number') {
      status = error.status
    }
    
    // Only include a sanitized error message for 4xx client errors
    // For 5xx server errors, keep the generic message to avoid information disclosure
    if (status >= 400 && status < 500) {
      errorResponse.message = error.message || 'Client error'
    }
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
