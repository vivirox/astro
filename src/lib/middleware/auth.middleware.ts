// Import necessary libraries and types
import type { APIContext } from 'astro'
import type { AuthRole } from '../../config/auth.config'
import type { AuditMetadata, AuditResource } from '../audit/types'
import type { AuthUser } from '../auth'
import { authConfig, hasRolePrivilege } from '../../config/auth.config'
import { createResourceAuditLog } from '../audit/log'
import { getCurrentUser } from '../auth'

// Define locals interface for Astro context
interface AstroLocals {
  user?: AuthUser
}

// Extend the APIContext type to properly type locals
interface APIContextWithUser extends APIContext {
  locals: AstroLocals
}

// Helper function to create resource object
function createResource(id: string, type: string): AuditResource {
  return { id, type }
}

/**
 * Middleware to ensure routes are authenticated
 */
export async function authGuard(
  context: APIContextWithUser,
): Promise<Response | undefined> {
  const user = await getCurrentUser(context.cookies)

  if (!user) {
    await createResourceAuditLog(
      'route_access_denied',
      'system',
      createResource(new URL(context.request.url).pathname, 'route'),
      {
        reason: 'missing_token',
        ipAddress:
          context.request.headers.get('x-forwarded-for') ||
          context.request.headers.get('x-real-ip') ||
          'unknown',
        userAgent: context.request.headers.get('user-agent') || 'unknown',
        method: context.request.method,
        path: new URL(context.request.url).pathname,
      } as AuditMetadata,
    )

    // Redirect to login page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${authConfig.redirects.authRequired}?redirect=${encodeURIComponent(
          context.request.url,
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
      await createResourceAuditLog(
        'route_access_denied',
        'system',
        createResource(new URL(context.request.url).pathname, 'route'),
        {
          reason: 'missing_token',
          ipAddress:
            context.request.headers.get('x-forwarded-for') ||
            context.request.headers.get('x-real-ip') ||
            'unknown',
          userAgent: context.request.headers.get('user-agent') || 'unknown',
          method: context.request.method,
          path: new URL(context.request.url).pathname,
        } as AuditMetadata,
      )

      // Redirect to login page
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${authConfig.redirects.authRequired}?redirect=${encodeURIComponent(
            context.request.url,
          )}`,
        },
      })
    }

    // Check the user's role
    const hasRequiredRole = hasRolePrivilege(user.role, role)

    if (!hasRequiredRole) {
      await createResourceAuditLog(
        'route_access_denied',
        'system',
        createResource(new URL(context.request.url).pathname, 'route'),
        {
          reason: 'insufficient_permissions',
          ipAddress:
            context.request.headers.get('x-forwarded-for') ||
            context.request.headers.get('x-real-ip') ||
            'unknown',
          userAgent: context.request.headers.get('user-agent') || 'unknown',
          method: context.request.method,
          path: new URL(context.request.url).pathname,
          requiredRole: role,
          userRole: user.role,
        } as AuditMetadata,
      )

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
 * Enhanced security version with additional validation and token checks
 */
export async function apiAuthGuard(
  request: Request,
  context: Record<string, unknown>,
): Promise<Response | undefined> {
  // Get request URL and path
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Extract client information for auditing and security checks
  const clientIp = 
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  // Check for Authorization header (Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await createResourceAuditLog(
      'api_access_denied',
      'system',
      createResource(path, 'api'),
      {
        reason: 'missing_token',
        ipAddress: clientIp,
        userAgent: userAgent,
        method: request.method,
        path: path,
        timestamp: new Date().toISOString(),
      } as AuditMetadata,
    );

    return new Response(
      JSON.stringify({ 
        error: 'Authentication required', 
        message: 'Missing or invalid authorization header',
        code: 'AUTH_REQUIRED'
      }),
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        }
      },
    );
  }

  // Extract token and prevent token tampering
  const token = authHeader.split(' ')[1].trim();
  
  // Validate token format to prevent attacks
  const tokenRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/;
  if (!token || !tokenRegex.test(token)) {
    await createResourceAuditLog(
      'api_access_denied',
      'system',
      createResource(path, 'api'),
      {
        reason: 'malformed_token',
        ipAddress: clientIp,
        userAgent: userAgent,
        method: request.method,
        path: path,
        timestamp: new Date().toISOString(),
      } as AuditMetadata,
    );

    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed', 
        message: 'Malformed token',
        code: 'INVALID_TOKEN_FORMAT'
      }),
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        }
      },
    );
  }

  try {
    // Verify token with auth service
    const verifyResponse = await fetch(
      `${authConfig.redirects.authRequired}/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      },
    );

    // Ensure response is OK before parsing
    if (!verifyResponse.ok) {
      throw new Error(`Auth verification failed with status: ${verifyResponse.status}`);
    }

    const { data, error } = await verifyResponse.json();

    if (error || !data?.user) {
      await createResourceAuditLog(
        'api_access_denied',
        'system',
        createResource(path, 'api'),
        {
          reason: 'invalid_token',
          ipAddress: clientIp,
          userAgent: userAgent,
          method: request.method,
          path: path,
          error: error?.message || 'Token verification failed',
          timestamp: new Date().toISOString(),
        } as AuditMetadata,
      );

      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed', 
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
          }
        },
      );
    }

    // Verify user has required fields
    const user = data.user as AuthUser;
    if (!user.id || !user.role) {
      await createResourceAuditLog(
        'api_access_denied',
        'system',
        createResource(path, 'api'),
        {
          reason: 'invalid_user_data',
          ipAddress: clientIp,
          userAgent: userAgent,
          method: request.method,
          path: path,
          timestamp: new Date().toISOString(),
        } as AuditMetadata,
      );

      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed', 
          message: 'Invalid user data in token',
          code: 'INVALID_USER_DATA'
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
          }
        },
      );
    }

    // Set the user data in context
    context.user = user;

    // Log the successful authentication
    await createResourceAuditLog(
      'api_authenticated',
      user.id,
      createResource(path, 'api'),
      {
        method: request.method,
        path: path,
        userRole: user.role,
        timestamp: new Date().toISOString(),
      } as AuditMetadata,
    );

    return undefined;
  } catch (error) {
    // Handle unexpected errors during authentication
    const typedError = error instanceof Error ? error : new Error(String(error));
    
    await createResourceAuditLog(
      'api_authentication_error',
      'system',
      createResource(path, 'api'),
      {
        reason: 'auth_service_error',
        ipAddress: clientIp,
        userAgent: userAgent,
        method: request.method,
        path: path,
        error: typedError.message,
        timestamp: new Date().toISOString(),
      } as AuditMetadata,
    );

    return new Response(
      JSON.stringify({ 
        error: 'Authentication service error', 
        message: 'An error occurred during authentication',
        code: 'AUTH_SERVICE_ERROR'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        }
      },
    );
  }
}

/**
 * API middleware for protecting routes by role
 */
export function apiRoleGuard(role: AuthRole) {
  return async (
    request: Request,
    context: Record<string, unknown>,
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
      await createResourceAuditLog(
        'api_access_denied',
        user.id,
        createResource(new URL(request.url).pathname, 'api'),
        {
          reason: 'insufficient_permissions',
          ipAddress:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          method: request.method,
          path: new URL(request.url).pathname,
          requiredRole: role,
          userRole: user.role,
        } as AuditMetadata,
      )

      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403 },
      )
    }

    return undefined
  }
}
