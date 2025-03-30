import { getLogger } from './logging'

const logger = getLogger()

/**
 * Handles API errors and returns sanitized responses
 * This prevents leaking sensitive information in error responses
 * 
 * @param error The error to handle
 * @returns A sanitized Response object
 */
export function handleApiError(error: unknown): Response {
  // Log the full error details for debugging
  logger.error('API error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : 'UnknownError',
    details: error,
  })

  // Default error response
  let status = 500
  let errorType = 'server_error'
  let message = 'An unexpected error occurred'

  // Extract information based on error type if it's safe to do so
  if (error instanceof Error) {
    // Only customize messages for known error types
    if (error.name === 'ValidationError') {
      status = 400
      errorType = 'validation_error'
      message = 'Invalid request data'
    } else if (error.name === 'AuthenticationError') {
      status = 401
      errorType = 'authentication_error'
      message = 'Authentication required'
    } else if (error.name === 'AuthorizationError') {
      status = 403
      errorType = 'authorization_error'
      message = 'Not authorized'
    } else if (error.name === 'NotFoundError') {
      status = 404
      errorType = 'not_found'
      message = 'Resource not found'
    } else if (error.name === 'RateLimitError') {
      status = 429
      errorType = 'rate_limit_error'
      message = 'Rate limit exceeded'
    }

    // Extract status from custom error properties if present
    if ('status' in error && typeof error.status === 'number') {
      status = error.status
    }
  }

  // For rate limit errors, include Retry-After header
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (status === 429) {
    headers['Retry-After'] = '60' // Default to 60 seconds
    // Extract retry time if available
    if (error && typeof error === 'object' && 'retryAfter' in error) {
      const retryAfter = error.retryAfter
      if (typeof retryAfter === 'number') {
        headers['Retry-After'] = String(retryAfter)
      }
    }
  }

  return new Response(
    JSON.stringify({
      error: errorType,
      message,
    }),
    {
      status,
      headers,
    }
  )
}

/**
 * Creates an API error handler for async route handlers
 * This wraps an API handler function with error handling
 * 
 * @param handler The API handler function
 * @returns A wrapped handler function with error handling
 */
export function withApiErrorHandling(
  handler: (request: Request, ...args: any[]) => Promise<Response>
) {
  return async (request: Request, ...args: any[]): Promise<Response> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
