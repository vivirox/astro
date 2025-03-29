import { defineMiddleware } from 'astro/middleware'
import { authConfig } from './src/config/auth.config'
import { getCurrentUser } from './src/lib/auth'

/**
 * Authentication and asset middleware
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
    }

    return response
  }

  // Process the request
  const response = await next()

  // No response means something went wrong or a redirect happened
  if (!response) return response

  // Set correct content types for assets
  setContentTypeHeaders(path, response)

  return response
})

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
