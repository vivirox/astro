import { defineMiddleware } from 'astro/middleware'

/**
 * Asset middleware to ensure correct MIME types
 * This addresses the CSS MIME type error issues
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Process the request first
  const response = await next()

  // No response means something went wrong or a redirect happened
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
})
