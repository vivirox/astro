import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro'
import type { AuthRole } from './config/auth.config'
import { defineMiddleware } from 'astro:middleware'
import { v4 as uuidv4 } from 'uuid'
import { hasRolePrivilege } from './config/auth.config'
import { getCurrentUser, isAuthenticated } from './lib/auth'
import { getLogger } from './lib/logging'

// Define AstroLocals interface for type casting
interface AstroLocals {
  headers: Record<string, string>
  isPrerendered: boolean
  isSSR: boolean
  userPreferences: {
    language: string
    darkMode: boolean
    reducedMotion: boolean
    userAgent: string
    ip: string
    isIOS: boolean
    isAndroid: boolean
    isMobile: boolean
  }
  user?: {
    id: string
    name?: string
    email?: string
    role?: string
  }
}

// Protected routes configuration
const PROTECTED_ROUTES = [
  { path: '/dashboard', roles: ['admin', 'therapist', 'client'] },
  { path: '/admin', roles: ['admin'] },
  { path: '/therapist', roles: ['admin', 'therapist'] },
  { path: '/client', roles: ['admin', 'client'] },
]

// Public routes that don't need authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/reset-password',
  '/reset-password-confirm',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
]

/**
 * Header safety middleware
 *
 * This middleware adds a local variable to Astro.locals to indicate if headers can be accessed
 * This helps prevent warnings in prerendered pages
 */
export const onRequest: MiddlewareHandler = defineMiddleware(
  async (context: APIContext, next: MiddlewareNext) => {
    const { request, cookies, locals, redirect } = context
    // Type cast locals to our interface to avoid TypeScript errors
    const typedLocals = locals as unknown as AstroLocals

    // Generate or get request ID
    const requestId = context.request.headers.get('x-request-id') || uuidv4()

    // Create a logger for this request
    const logger = getLogger({ prefix: requestId })

    // Basic request information
    const method = request.method
    const url = new URL(request.url)
    const path = url.pathname
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referer = request.headers.get('referer') || 'direct'
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown'

    // Store headers in locals for safe access in components
    typedLocals.headers = {}
    request.headers.forEach((value: string, key: string) => {
      typedLocals.headers[key.toLowerCase()] = value
    })

    // Add helper functions to check environment
    typedLocals.isPrerendered = !import.meta.env.SSR
    typedLocals.isSSR = import.meta.env.SSR

    // Store browser preferences in locals - safer than direct header access
    typedLocals.userPreferences = {
      language:
        request.headers.get('accept-language')?.split(',')[0] || 'en-US',
      darkMode: request.headers.get('sec-ch-prefers-color-scheme') === 'dark',
      reducedMotion:
        request.headers.get('sec-ch-prefers-reduced-motion') === 'reduce',
      userAgent,
      ip,
      isIOS: userAgent.includes('iPhone') || userAgent.includes('iPad'),
      isAndroid: userAgent.includes('Android'),
      isMobile: /iPhone|iPad|Android|Mobile/.test(userAgent),
    }

    // Log the start of the request
    logger.info(`${method} ${path}`, {
      request: {
        method,
        path,
        query: Object.fromEntries(url.searchParams),
        userAgent,
        referer,
        ip,
      },
    })

    // Skip auth check for public routes
    if (
      PUBLIC_ROUTES.some(
        (route) => path === route || path.startsWith(`${route}/`),
      )
    ) {
      return next()
    }

    // Check for API routes with their own auth
    if (path.startsWith('/api/')) {
      return next()
    }

    // Check if user is authenticated
    const authenticated = await isAuthenticated(cookies)
    if (!authenticated) {
      return redirect(`/login?redirect=${encodeURIComponent(path)}`)
    }

    // For protected routes, check role-based access
    const protectedRoute = PROTECTED_ROUTES.find(
      (route) => path === route.path || path.startsWith(`${route.path}/`),
    )

    if (protectedRoute) {
      const user = await getCurrentUser(cookies)
      if (!user) {
        return redirect(`/login?redirect=${encodeURIComponent(path)}`)
      }

      // Check if user has required role
      const hasRequiredRole = protectedRoute.roles.some((role) =>
        hasRolePrivilege(user.role, role as AuthRole),
      )

      if (!hasRequiredRole) {
        // Redirect to unauthorized page or dashboard
        return redirect('/unauthorized')
      }
    }

    // Continue to the route
    const response = await next()

    // Log completion if needed
    logger.info(`${method} ${path} completed`, {
      status: response.status,
    })

    return response
  },
)
