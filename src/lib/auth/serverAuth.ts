import type { APIRoute } from 'astro'
import type { AstroCookies } from 'astro'
import type { AuthRole } from '../../config/auth.config'
import type { AuthUser } from '../auth'
import type { ProtectRouteOptions } from './apiRouteTypes'
import { getLogger } from '../logging'
import { createResourceAuditLog } from '../audit/log'
import { getCurrentUser, isAuthenticated } from '../auth'
import { RedisService } from '../services/redis/RedisService'
import { hasRolePrivilege } from '../../config/auth.config'

// Initialize logger
const logger = getLogger('serverAuth')
const redisService = new RedisService()

// Rate limiting settings
const MAX_AUTH_ATTEMPTS = 5
const RATE_LIMIT_WINDOW = 60 * 15 // 15 minutes in seconds
const RATE_LIMIT_BLOCK_TIME = 60 * 60 // 1 hour in seconds

// Interface for the function parameters
interface ServerAuthOptions {
  cookies: AstroCookies
  request: Request
  requestIp: string
  requiredRole?: AuthRole
  validateIPMatch?: boolean
  validateUserAgent?: boolean
}

/**
 * Enhanced server-side auth check with additional security features
 */
export async function verifyServerAuth({
  cookies,
  request,
  requestIp,
  requiredRole,
  validateIPMatch = true,
  validateUserAgent = true,
}: ServerAuthOptions): Promise<{
  authenticated: boolean
  user: AuthUser | null
  reason?: string
}> {
  try {
    // Check if IP is rate limited
    const isRateLimited = await checkRateLimit(requestIp)
    if (isRateLimited) {
      logger.warn(`Rate limit exceeded for IP: ${requestIp}`)
      return { authenticated: false, user: null, reason: 'rate_limited' }
    }

    // Increment attempt counter
    await redisService.client.incr(`auth_attempts:${requestIp}`)
    await redisService.client.expire(
      `auth_attempts:${requestIp}`,
      RATE_LIMIT_WINDOW,
    )

    // Basic authentication check
    const authenticated = await isAuthenticated(cookies)
    if (!authenticated) {
      return { authenticated: false, user: null, reason: 'not_authenticated' }
    }

    // Get user details
    const user = await getCurrentUser(cookies)
    if (!user) {
      return { authenticated: false, user: null, reason: 'user_not_found' }
    }

    // If we require a specific role, check it
    if (requiredRole && !hasRolePrivilege(user.role, requiredRole)) {
      await createResourceAuditLog(
        'server_auth_denied',
        user.id,
        { id: new URL(request.url).pathname, type: 'route' },
        {
          reason: 'insufficient_permissions',
          requiredRole,
          userRole: user.role,
        },
      )
      return { authenticated: false, user, reason: 'insufficient_permissions' }
    }

    // Validate IP match if enabled
    if (validateIPMatch) {
      const lastKnownIp = await redisService.client.get(`user_ip:${user.id}`)

      // If we have a last known IP and it doesn't match current IP
      if (lastKnownIp && lastKnownIp !== requestIp) {
        logger.warn(
          `IP mismatch for user ${user.id}: ${lastKnownIp} vs ${requestIp}`,
        )

        // Log suspicious activity but don't block yet - this could be legitimate (VPN, network change)
        await createResourceAuditLog(
          'suspicious_ip_change',
          user.id,
          { id: user.id, type: 'user' },
          {
            previousIp: lastKnownIp,
            currentIp: requestIp,
          },
        )
      }

      // Update the last known IP
      await redisService.client.set(`user_ip:${user.id}`, requestIp)
      await redisService.client.expire(`user_ip:${user.id}`, 60 * 60 * 24 * 7) // 7 days
    }

    // Validate user agent if enabled
    if (validateUserAgent) {
      const userAgent = request.headers.get('user-agent') || 'unknown'
      const lastUserAgent = await redisService.client.get(
        `user_agent:${user.id}`,
      )

      // If we have a last known user agent and it doesn't match current one
      if (lastUserAgent && lastUserAgent !== userAgent) {
        logger.warn(`User agent change for user ${user.id}`)

        // Log suspicious activity but don't block
        await createResourceAuditLog(
          'suspicious_user_agent_change',
          user.id,
          { id: user.id, type: 'user' },
          {
            previousUserAgent: lastUserAgent,
            currentUserAgent: userAgent,
          },
        )
      }

      // Update the last known user agent
      await redisService.client.set(`user_agent:${user.id}`, userAgent)
      await redisService.client.expire(
        `user_agent:${user.id}`,
        60 * 60 * 24 * 7,
      ) // 7 days
    }

    // Reset attempt counter on successful auth
    await redisService.client.del(`auth_attempts:${requestIp}`)

    // Log successful authentication for auditing
    await createResourceAuditLog(
      'server_auth_success',
      user.id,
      { id: new URL(request.url).pathname, type: 'route' },
      {
        method: request.method,
        ip: requestIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    )

    return { authenticated: true, user }
  } catch (error) {
    logger.error('Server auth error:', error)
    return { authenticated: false, user: null, reason: 'server_error' }
  }
}

/**
 * Check if an IP is rate limited
 */
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    // Check if the IP is blocked
    const isBlocked = await redisService.client.exists(`auth_blocked:${ip}`)
    if (isBlocked) {
      return true
    }

    // Check attempt count
    const attempts = await redisService.client.get(`auth_attempts:${ip}`)
    const attemptCount = attempts ? parseInt(attempts, 10) : 0

    // If over threshold, block the IP
    if (attemptCount >= MAX_AUTH_ATTEMPTS) {
      await redisService.client.set(`auth_blocked:${ip}`, '1')
      await redisService.client.expire(
        `auth_blocked:${ip}`,
        RATE_LIMIT_BLOCK_TIME,
      )

      // Log the rate limit event
      await createResourceAuditLog(
        'rate_limit_triggered',
        'system',
        { id: ip, type: 'ip_address' },
        {
          attempts: attemptCount,
          blockDuration: RATE_LIMIT_BLOCK_TIME,
        },
      )

      return true
    }

    return false
  } catch (error) {
    logger.error('Rate limit check error:', error)
    return false // Default to allowing on error
  }
}

/**
 * Higher-order function to protect API routes with server-side auth
 */
export function protectRoute<
  Props extends Record<string, any> = Record<string, any>,
  Params extends Record<string, string | undefined> = Record<
    string,
    string | undefined
  >,
>(
  Astro: unknown,
  p0: string[],
  options: ProtectRouteOptions,
): (
  handler: (
    context: AuthAPIContext<Props, Params>,
  ) => Response | Promise<Response>,
) => APIRoute {
  return (handler) => {
    const apiRouteHandler: APIRoute = async (context) => {
      const { request, cookies } = context

      // Get the client IP
      const requestIp =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'

      const { authenticated, user, reason } = await verifyServerAuth({
        cookies,
        request,
        requestIp,
        requiredRole: options.requiredRole,
        validateIPMatch: options.validateIPMatch,
        validateUserAgent: options.validateUserAgent,
      })

      if (!authenticated) {
        if (reason === 'rate_limited') {
          return new Response(
            JSON.stringify({ error: 'Too many authentication attempts' }),
            {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        if (reason === 'insufficient_permissions') {
          return new Response(
            JSON.stringify({ error: 'Insufficient permissions' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }

        // Default auth failure
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      // Set user in locals
      context.locals.user = user

      // Create an auth context with the user
      const authContext = context as unknown as AuthAPIContext<Props, Params>

      // Continue to the route handler
      return handler(authContext)
    }

    return apiRouteHandler
  }
}

/**
 * Utility for monitoring and logging out suspicious activity
 */
export async function trackSuspiciousActivity(
  user: AuthUser,
  request: Request,
  reason: string,
): Promise<void> {
  const requestIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  await createResourceAuditLog(
    'suspicious_activity',
    user.id,
    { id: user.id, type: 'user' },
    {
      reason,
      ip: requestIp,
      userAgent: request.headers.get('user-agent') || 'unknown',
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    },
  )

  // Could implement additional security measures here:
  // - Send email alerts to admins
  // - Force logout on all devices
  // - Require re-verification
  logger.warn(`Suspicious activity detected for user ${user.id}: ${reason}`)
}
