import { defineMiddleware } from 'astro/middleware'

// A simple middleware that does nothing but pass the request through
export const onRequest = defineMiddleware((context, next) => {
  // Simply pass through all requests
  return next()
})
