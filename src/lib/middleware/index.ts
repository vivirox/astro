import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro'
import { sequence } from 'astro:middleware'
import { auditLoggingMiddleware } from './audit-logging'
import { corsMiddleware } from './cors'
import { csrfMiddleware } from './csrf'
import { errorHandlingMiddleware } from './error-handling'
import { loggingMiddleware } from './logging'
import { rateLimitMiddleware } from './rate-limit'

/**
 * Content Type middleware to ensure proper MIME types
 * This helps resolve issues with CSS files being served with incorrect MIME types
 */
const contentTypeMiddleware: MiddlewareHandler = async (
  context: APIContext,
  next: MiddlewareNext,
) => {
  // Process the request first
  const response = await next()

  if (!response) return response

  const url = new URL(context.request.url)
  const path = url.pathname

  // Set correct content types based on file extensions
  if (path.endsWith('.css')) {
    response.headers.set('Content-Type', 'text/css; charset=utf-8')
  } else if (path.endsWith('.js')) {
    response.headers.set(
      'Content-Type',
      'application/javascript; charset=utf-8',
    )
  } else if (path.endsWith('.json')) {
    response.headers.set('Content-Type', 'application/json; charset=utf-8')
  } else if (path.endsWith('.svg')) {
    response.headers.set('Content-Type', 'image/svg+xml')
  } else if (path.endsWith('.png')) {
    response.headers.set('Content-Type', 'image/png')
  } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    response.headers.set('Content-Type', 'image/jpeg')
  } else if (path.endsWith('.webp')) {
    response.headers.set('Content-Type', 'image/webp')
  } else if (path.endsWith('.woff2')) {
    response.headers.set('Content-Type', 'font/woff2')
  } else if (path.endsWith('.woff')) {
    response.headers.set('Content-Type', 'font/woff')
  }

  return response
}

/**
 * Apply security headers to all responses
 * Based on best practices and penetration testing results
 */
const securityHeadersMiddleware: MiddlewareHandler = async (
  _context: APIContext,
  next: MiddlewareNext,
) => {
  // Process the request first
  const response = await next()

  if (!response) return response

  // Prevent browsers from interpreting files as a different MIME type
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Prevent your page from being framed by other sites
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Enable browser XSS filtering
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Enforce HTTPS connection
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  
  // Control how much referrer information is sent
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Restrict which browser features can be used
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // Set Content-Security-Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://api.together.xyz; " +
      "img-src 'self' data: blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "font-src 'self'; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self';"
  )
  
  // Remove server information headers
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')

  return response
}

export interface ExtendedMiddleware extends MiddlewareHandler {
  (context: APIContext, next: MiddlewareNext): Promise<Response | undefined>
}

/**
 * Combined middleware sequence that applies our middleware in the correct order
 * 
 * Order is important:
 * 1. Error handling wraps everything
 * 2. Logging is early to log all requests
 * 3. Security headers are applied to all responses
 * 4. CORS headers are applied next
 * 5. Rate limiting protects against abuse
 * 6. CSRF protection for form submissions
 * 7. Audit logging for security compliance
 * 8. Content type headers ensure proper MIME types
 */
export const middlewareSequence = sequence(
  errorHandlingMiddleware,
  loggingMiddleware,
  securityHeadersMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  csrfMiddleware,
  auditLoggingMiddleware,
  contentTypeMiddleware,
)
