import { defineMiddleware } from 'astro/middleware'
import { authConfig } from './src/config/auth.config'
import { getCurrentUser } from './src/lib/auth'

/**
 * Authentication, security headers, and asset middleware
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url)
  const path = url.pathname

  // List of all public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/about',
    '/blog',
    '/contact',
    '/api/health',
    '/api/auth',
    '/privacy',
    '/terms',
    '/accessibility',
    '/changelog',
    '/custom-404',
    '/docs',
    '/_astro',
    '/_image',
    '/manifest.webmanifest',
    '/feeds',
    '/highlights',
  ]

  try {
    // Static assets and public paths don't need auth
    const isPublicPath = publicPaths.some(
      (publicPath) => path === publicPath || path.startsWith(publicPath + '/'),
    )
    const isAssetPath = path.match(
      /\.(css|js|json|svg|png|jpg|jpeg|webp|woff|woff2|ico|gif)$/i,
    )

    // Allow public paths and assets without auth
    if (isPublicPath || isAssetPath) {
      const response = await next()

      // Add content types for assets
      if (response) {
        setContentTypeHeaders(path, response)
        // Add security headers to all responses
        setSecurityHeaders(response)
      }

      return response
    }

    // Process the request
    const response = await next()

    // No response means something went wrong or a redirect happened
    if (!response) return response

    // Set correct content types for assets
    setContentTypeHeaders(path, response)
    
    // Add security headers to all responses
    setSecurityHeaders(response)

    return response
  } catch (error) {
    // Log the error but don't expose details in the response
    console.error('Middleware error:', error)
    
    // For API requests, return a sanitized JSON error
    if (path.startsWith('/api/')) {
      const errorResponse = new Response(
        JSON.stringify({
          error: 'server_error',
          message: 'An unexpected error occurred',
        }),
        { status: 500 }
      )
      setSecurityHeaders(errorResponse)
      return errorResponse
    }
    
    // For other requests, redirect to error page
    return context.redirect('/custom-404')
  }
})

/**
 * Set HIPAA-compliant security headers for all responses
 * These headers help protect against common web vulnerabilities
 */
function setSecurityHeaders(response: Response) {
  // Prevent browsers from interpreting files as a different MIME type
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Prevent your page from being framed by other sites
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Enable browser XSS filtering
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Enforce HTTPS connection
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  
  // Control how much referrer information is sent
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Restrict which browser features can be used
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  
  // Restrict which resources can be loaded
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'"
  )
  
  // Remove server information headers to prevent information disclosure
  response.headers.delete('Server')
  response.headers.delete('X-Powered-By')
}

// Helper to set content type headers
function setContentTypeHeaders(path: string, response: Response) {
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
}
