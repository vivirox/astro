// Import necessary libraries and types
import type { APIContext } from 'astro'
import {
  authConfig,
  type AuthRole,
  hasRolePrivilege,
} from '../../config/auth.config'
import { getCurrentUser } from '../auth'
import type { AuthUser } from '../auth'
import { createAuditLog } from '../audit/log'

// Define locals interface for Astro context
interface AstroLocals {
  user?: AuthUser
}

// Extend the APIContext type to properly type locals
interface APIContextWithUser extends APIContext {
  locals: AstroLocals
}

/**
 * Middleware to ensure routes are authenticated
 */
export async function authGuard(
  context: APIContextWithUser
): Promise<Response | undefined> {
  const user = await getCurrentUser(context.cookies)

  if (!user) {
    await createAuditLog({
      action: 'auth_required_redirect',
      resource: 'route',
      resourceId: context.request.url,
      metadata: {
        method: context.request.method,
        path: new URL(context.request.url).pathname,
      },
    })

    // Redirect to login page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${authConfig.redirects.authRequired}?redirect=${encodeURIComponent(
          context.request.url
        )}`,
      },
    })
  }

  // Attach user to context
  ;(context.locals as AstroLocals).user = user

  return undefined
}

/**
 * Middleware to ensure routes are accessible only by users with specific roles
 */
export function roleGuard(role: AuthRole) {
  return async (context: APIContext): Promise<Response | undefined> => {
    const user = await getCurrentUser(context.cookies)

    if (!user) {
      await createAuditLog({
        action: 'auth_required_redirect',
        resource: 'route',
        resourceId: context.request.url,
        metadata: {
          method: context.request.method,
          path: new URL(context.request.url).pathname,
        },
      })

      // Redirect to login page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${authConfig.redirects.authRequired}?redirect=${encodeURIComponent(
            context.request.url
          )}`,
        },
      })
    }

    // Check the user's role
    const hasRequiredRole = hasRolePrivilege(user.role, role)

    if (!hasRequiredRole) {
      await createAuditLog({
        userId: user.id,
        action: 'access_denied',
        resource: 'route',
        resourceId: context.request.url,
        metadata: {
          method: context.request.method,
          path: new URL(context.request.url).pathname,
          userRole: user.role,
          requiredRole: role,
        },
      })

      // Redirect to forbidden page
      return new Response(null, {
        status: 302,
        headers: {
          Location: authConfig.redirects.forbidden,
        },
      })
    }

    // Attach user to context
    ;(context.locals as AstroLocals).user = user

    return undefined
  }
}

// Define interface for API context with user
interface ApiContextWithUser extends Record<string, unknown> {
  user: AuthUser
}

/**
 * API middleware for protecting API routes
 */
export async function apiAuthGuard(
  request: Request,
  context: Record<string, unknown>
): Promise<Response | undefined> {
  // Check for Authorization header (Bearer token)
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        error: 'Authentication required',
        message: 'Missing or invalid Authorization header',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Extract token and verify
  const token = authHeader.split(' ')[1]
  const { data, error } = await fetch(
    `${authConfig.redirects.authRequired}/verify`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    }
  ).then((res) => res.json())

  if (error || !data?.user) {
    return new Response(
      JSON.stringify({
        error: 'Authentication failed',
        message: error || 'Invalid or expired token',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Set the user data in context
  context.user = data.user as AuthUser

  // Log the successful authentication
  await createAuditLog({
    userId: data.user.id,
    action: 'api_authenticated',
    resource: 'api',
    resourceId: request.url,
    metadata: {
      method: request.method,
      path: new URL(request.url).pathname,
    },
  })

  return undefined
}

/**
 * API middleware for protecting routes by role
 */
export function apiRoleGuard(role: AuthRole) {
  return async (
    request: Request,
    context: Record<string, unknown>
  ): Promise<Response | undefined> => {
    // First ensure the user is authenticated
    const authResponse = await apiAuthGuard(request, context)
    if (authResponse) {
      return authResponse
    }

    // At this point we know context.user exists
    const apiContext = context as ApiContextWithUser
    const user = apiContext.user

    // Check if the user has the required role
    if (!hasRolePrivilege(user.role, role)) {
      await createAuditLog({
        userId: user.id,
        action: 'api_access_denied',
        resource: 'api',
        resourceId: request.url,
        metadata: {
          method: request.method,
          path: new URL(request.url).pathname,
          userRole: user.role,
          requiredRole: role,
        },
      })

      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: `This endpoint requires ${role} privileges`,
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return undefined
  }
}
