import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro'
import { sequence } from 'astro:middleware'
import { auditLoggingMiddleware } from './audit-logging'
import { corsMiddleware } from './cors'
import { csrfMiddleware } from './csrf'
import { loggingMiddleware } from './logging'
import { rateLimitMiddleware } from './rate-limit'

/**
 * Apply security headers to all responses
 * Based on best practices and penetration testing results
 */
const securityHeadersMiddleware: MiddlewareHandler = async (
  _context: APIContext,
  next: MiddlewareNext,
) => {
  // Process the request firs
  const response = await next()

  // Add security headers
  response?.headers.set('X-Content-Type-Options', 'nosniff')
  response?.headers.set('X-Frame-Options', 'DENY')
  response?.headers.set('X-XSS-Protection', '1; mode=block')
  response?.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  )
  response?.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response?.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  )

  // Set Content-Security-Policy
  response?.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://api.together.xyz; " +
      "img-src 'self' data: blob:; " +
      "style-src 'self' 'unsafe-inline'; " +
      "font-src 'self'; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self';",
  )

  return response
}

export interface ExtendedMiddleware extends MiddlewareHandler {
  (context: APIContext, next: MiddlewareNext): Promise<Response | undefined>
}

/**
 * Apply middleware in the correct sequence:
 * 1. Audit Logging - capture security events for compliance
 * 2. Logging - track all requests with request IDs
 * 3. CORS - handle preflight requests
 * 4. Rate Limiting - protect against abuse
 * 5. CSRF Protection - prevent cross-site request forgery attacks
 * 6. Security Headers - apply to all responses
 */
export const onRequest = sequence(
  auditLoggingMiddleware,
  loggingMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  csrfMiddleware,
  securityHeadersMiddleware,
)
