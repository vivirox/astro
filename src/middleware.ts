import type { AuthRole } from './config/auth.config'
import { defineMiddleware } from 'astro:middleware'
import { hasRolePrivilege } from './config/auth.config'
import { getCurrentUser, isAuthenticated } from './lib/auth'

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

export const onRequest = defineMiddleware(
  async ({ request, cookies, redirect }, next) => {
    const url = new URL(request.url)
    const pathname = url.pathname

    // Skip auth check for public routes
    if (
      PUBLIC_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      )
    ) {
      return next()
    }

    // Check for API routes with their own auth
    if (pathname.startsWith('/api/')) {
      return next()
    }

    // Check if user is authenticated
    const authenticated = await isAuthenticated(cookies)
    if (!authenticated) {
      return redirect(`/login?redirect=${encodeURIComponent(pathname)}`)
    }

    // For protected routes, check role-based access
    const protectedRoute = PROTECTED_ROUTES.find(
      (route) =>
        pathname === route.path || pathname.startsWith(`${route.path}/`),
    )

    if (protectedRoute) {
      const user = await getCurrentUser(cookies)
      if (!user) {
        return redirect(`/login?redirect=${encodeURIComponent(pathname)}`)
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
    return next()
  },
)
