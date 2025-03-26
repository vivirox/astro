import type { APIContext, MiddlewareHandler, MiddlewareNext } from 'astro'
import type { AuthRole } from './config/auth.config'
import { defineMiddleware } from 'astro:middleware'
import { v4 as uuidv4 } from 'uuid'
import { hasRolePrivilege } from './config/auth.config'
import { getCurrentUser, isAuthenticated } from './lib/auth'
import { getLogger } from './lib/logging'

// Initialize logger
const logger = getLogger()

// Define AstroLocals interface for type casting
interface AstroLocals {
  user?: {
    id: string
    role: AuthRole
  }
  requestId: string
  userAgent: {
    browser: string
    os: string
    isMobile: boolean
  }
}

// Protected routes configuration
const PROTECTED_ROUTES = [
  { path: '/dashboard', roles: ['admin', 'therapist', 'client', 'user'] },
  { path: '/admin', roles: ['admin'] },
  { path: '/therapist', roles: ['admin', 'therapist'] },
  { path: '/chat', roles: ['admin', 'therapist', 'client', 'user'] },
  { path: '/simulator', roles: ['admin', 'therapist', 'client', 'user'] },
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

export const onRequest = defineMiddleware(
  async ({ request, cookies, locals, redirect }, next) => {
    const typedLocals = locals as AstroLocals

    // Generate or get request ID
    const requestId = request.headers.get('x-request-id') || uuidv4()

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
      request.headers.get('x-real-ip') ||
      'unknown'

    // Add request context to locals
    typedLocals.requestId = requestId
    typedLocals.userAgent = {
      browser: getBrowser(userAgent),
      os: getOS(userAgent),
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
      logger.info(`Redirecting unauthenticated user from ${path} to login`)
      return redirect(`/login?redirect=${encodeURIComponent(path)}`)
    }

    // Get user for role checks
    const user = await getCurrentUser(cookies)
    typedLocals.user = user

    // For protected routes, check role-based access
    const protectedRoute = PROTECTED_ROUTES.find(
      (route) => path === route.path || path.startsWith(`${route.path}/`),
    )

    if (protectedRoute) {
      if (!user) {
        logger.warn(`User not found for authenticated session on ${path}`)
        return redirect(`/login?redirect=${encodeURIComponent(path)}`)
      }

      // Check if user has required role
      const hasRequiredRole = protectedRoute.roles.some((role) =>
        hasRolePrivilege(user.role, role as AuthRole),
      )

      if (!hasRequiredRole) {
        logger.warn(
          `User ${user.id} with role ${user.role} attempted to access ${path}`,
        )
        return redirect('/unauthorized')
      }

      logger.info(`User ${user.id} authorized for ${path}`)
    }

    // Continue to the route
    const response = await next()

    // Log completion
    logger.info(`${method} ${path} completed`, {
      status: response.status,
    })

    return response
  },
)

function getBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  return 'Other'
}

function getOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'
  return 'Other'
}
