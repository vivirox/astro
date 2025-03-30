import { defineMiddleware } from 'astro:middleware'

/**
 * CORS configuration
 */
export const corsOptions = {
  // Explicitly define allowed origins for better security
  // Avoid wildcards when possible
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:8080',
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'https://app.yourdomain.com',
    'https://api.yourdomain.com',
  ],
  // Specify only the methods you actually need
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Specify only the headers you actually need
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  // Headers that the client is allowed to access
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // 24 hours
  credentials: true,
}

/**
 * Validates if an origin matches the allowed patterns
 */
function isOriginAllowed(origin: string): boolean {
  return corsOptions.allowedOrigins.some((allowedOrigin) => {
    // Exact match
    if (allowedOrigin === origin) {
      return true
    }
    
    // If we need to support subdomains in the future:
    // Convert to regex pattern for specific subdomain wildcards like *.yourdomain.com
    if (allowedOrigin.includes('*')) {
      const pattern = new RegExp(
        `^${allowedOrigin.replace('*', '[\\w-]+').replace('.', '\\.')}$`
      )
      return pattern.test(origin)
    }
    
    return false
  })
}

/**
 * CORS middleware implementation
 */
export const corsMiddleware = defineMiddleware(async ({ request }, next) => {
  // Only apply CORS to API routes
  if (!request.url.includes('/api/')) {
    return next()
  }

  const origin = request.headers.get('Origin')

  // Process the request first
  let response = await next()
  
  // Create a new response if one wasn't returned
  if (!response) {
    response = new Response(null, { status: 204 })
  }

  // Apply CORS headers if origin is present
  if (origin) {
    // Check if origin is allowed
    const isAllowed = isOriginAllowed(origin)

    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin)

      if (corsOptions.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true')
      }

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        response.headers.set(
          'Access-Control-Allow-Methods',
          corsOptions.allowedMethods.join(', '),
        )
        response.headers.set(
          'Access-Control-Allow-Headers',
          corsOptions.allowedHeaders.join(', '),
        )
        response.headers.set(
          'Access-Control-Max-Age',
          corsOptions.maxAge.toString(),
        )

        if (corsOptions.exposedHeaders.length > 0) {
          response.headers.set(
            'Access-Control-Expose-Headers',
            corsOptions.exposedHeaders.join(', '),
          )
        }

        // Return 204 No Content for preflight requests
        return new Response(null, {
          status: 204,
          headers: response.headers,
        })
      }

      // Add exposed headers for non-preflight requests
      if (corsOptions.exposedHeaders.length > 0) {
        response.headers.set(
          'Access-Control-Expose-Headers',
          corsOptions.exposedHeaders.join(', '),
        )
      }
    } else {
      // For better security, return same headers for disallowed origins
      // but don't actually set Access-Control-Allow-Origin
      // This prevents information disclosure about which origins are allowed
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204 })
      }
    }
  }

  return response
})
