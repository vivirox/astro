import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro'
import { sequence } from 'astro:middleware'
import { auditLoggingMiddleware } from './audit-logging'
import { corsMiddleware } from './cors'
import { csrfMiddleware } from './csrf'
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
 * Enhanced for HIPAA compliance and security scan requirements
 */
const securityHeadersMiddleware: MiddlewareHandler = async (
  context: APIContext,
  next: MiddlewareNext,
) => {
  // Process the request first
  const response = await next()
  
  if (!response) return response

  // Basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload',
  )
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Enhanced permissions policy to limit access to sensitive features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), document-domain=(), interest-cohort=()',
  )
  
  // Enhanced security headers for HIPAA compliance
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Check if it's an API request
  const url = new URL(context.request.url)
  const isApiRequest = url.pathname.startsWith('/api/')
  
  // Set Content-Security-Policy based on request type
  if (isApiRequest) {
    // More restrictive policy for API endpoints
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; " +
      "script-src 'none'; " +
      "connect-src 'self'; " +
      "img-src 'none'; " +
      "style-src 'none'; " +
      "font-src 'none'; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'none'; " +
      "form-action 'none'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests; " +
      "report-uri /api/security/csp-report; " +
      "report-to csp-endpoint"
    )
  } else {
    // Standard CSP for regular pages with enhanced security
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self'; " +
      "connect-src 'self' https://api.together.xyz; " +
      "img-src 'self' data: blob:; " +
      "style-src 'self'; " +
      "font-src 'self'; " +
      "frame-src 'none'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests; " +
      "report-uri /api/security/csp-report; " +
      "report-to csp-endpoint"
    )
  }
  
  // Add Report-To header for CSP violation reporting (modern browsers)
  response.headers.set(
    'Report-To',
    JSON.stringify({
      'group': 'csp-endpoint',
      'max_age': 10886400,
      'endpoints': [
        { 'url': '/api/security/csp-report' }
      ],
      'include_subdomains': true
    })
  )

  return response
}

export interface ExtendedMiddleware extends MiddlewareHandler {
  (context: APIContext, next: MiddlewareNext): Promise<Response | undefined>
}

/**
 * Combined middleware sequence that applies our middleware in the correct order
 */
export const middlewareSequence = sequence(
  loggingMiddleware,
  corsMiddleware,
  csrfMiddleware,
  securityHeadersMiddleware,
  contentTypeMiddleware,
)
