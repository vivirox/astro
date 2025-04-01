import { defineMiddleware } from 'astro:middleware'
import { getSession } from '../auth/session'
import { getLogger } from '../logging'
import { redis } from '../redis'

// Initialize logger
const logger = getLogger()

// Rate limit configuration for different API endpoints
export interface RateLimitConfig {
  /** Path pattern to match */
  path: string
  /** Rate limits by role */
  limits: Record<string, number>
  /** Time window in milliseconds */
  windowMs: number
}

// Default rate limit configuration for different endpoints
const rateLimitConfigs: RateLimitConfig[] = [
  {
    path: '/api/ai/',
    limits: {
      admin: 120, // 120 requests per minute for admins
      therapist: 80, // 80 requests per minute for therapists
      user: 40, // 40 requests per minute for regular users
      anonymous: 10, // 10 requests per minute for unauthenticated users
    },
    windowMs: 60 * 1000, // 1 minute
  },
  {
    path: '/api/auth/',
    limits: {
      admin: 30,
      therapist: 30,
      user: 20,
      anonymous: 5,
    },
    windowMs: 60 * 1000, // 1 minute
  },
  {
    path: '/api/',
    limits: {
      admin: 300,
      therapist: 200,
      user: 100,
      anonymous: 30,
    },
    windowMs: 60 * 1000, // 1 minute
  },
]

/**
 * Redis-based rate limiter implementation
 */
export class RateLimiter {
  private readonly defaultLimit: number
  private readonly windowMs: number
  private readonly userLimits: Record<string, number>

  constructor(defaultLimit = 30, windowMs = 60 * 1000) {
    this.defaultLimit = defaultLimit
    this.defaultLimit = defaultLimit
    this.windowMs = windowMs
    this.userLimits = {
      admin: 60,
      therapist: 40,
      user: 30,
      anonymous: 15,
    }
  }

  /**
   * Check if a request from the specified identifier is rate limited
   */
  public async check(
    identifier: string,
    role = 'anonymous',
    pathSpecificLimits?: Record<string, number>,
    customWindowMs?: number,
  ): Promise<{
    allowed: boolean
    limit: number
    remaining: number
    reset: number
  }> {
    const now = Date.now()
    const windowMs = customWindowMs || this.windowMs
    const limit =
      pathSpecificLimits?.[role] || this.userLimits[role] || this.defaultLimit

    // Create Redis key with path and role information
    const key = `ratelimit:${identifier}:${role}`

    try {
      // Use Redis transaction to ensure atomic operations
      const multi = redis.multi()

      // Get current count and expiry
      multi.get(key)
      multi.ttl(key)

      const [countStr, ttl] = await multi.exec()
      const count = parseInt((countStr as string) || '0', 10)

      // If key doesn't exist or has expired, create new entry
      if (ttl < 0) {
        await redis.setex(key, Math.ceil(windowMs / 1000), '1')
        return {
          allowed: true,
          limit,
          remaining: limit - 1,
          reset: now + windowMs,
        }
      }

      // Check if limit exceeded
      if (count >= limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          reset: now + ttl * 1000,
        }
      }

      // Increment counter
      await redis.incr(key)

      return {
        allowed: true,
        limit,
        remaining: limit - (count + 1),
        reset: now + ttl * 1000,
      }
    } catch (error: unknown) {
      logger.error('Redis rate limit error:', error as Record<string, unknown>)
      // Fail open - allow request in case of Redis errors
      return {
        allowed: true,
        limit,
        remaining: 1,
        reset: now + windowMs,
      }
    }
  }
}

// Create a rate limiter instance
const rateLimiter = new RateLimiter()

// Export the rate limit function for use in API routes
export async function rateLimit(request: Request, role = 'anonymous') {
  const url = new URL(request.url)
  const path = url.pathname

  // Find the matching rate limit configuration
  const config = findMatchingConfig(path)

  if (!config) {
    // No specific configuration found, allow the request
    return { allowed: true }
  }

  // Get client identifier - prefer user ID or IP address
  let identifier =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('cf-connecting-ip') ||
    'anonymous'

  // Create a composite identifier that includes the API path type
  const compositeIdentifier = `${identifier}:${config.path}`

  // Check rate limit
  return rateLimiter.check(
    compositeIdentifier,
    role,
    config.limits,
    config.windowMs,
  )
}

/**
 * Find the matching rate limit configuration for a given path
 */
function findMatchingConfig(path: string): RateLimitConfig | undefined {
  // Sort configs by specificity (longest path first)
  const sortedConfigs = [...rateLimitConfigs].sort(
    (a, b) => b.path.length - a.path.length,
  )

  // Find the first config that matches the path
  return sortedConfigs.find((config) => path.includes(config.path))
}

/**
 * Rate limiting middleware
 * Restricts the number of requests a client can make in a given time window
 */
export const rateLimitMiddleware = defineMiddleware(
  async ({ request }, next) => {
    const url = new URL(request.url)
    const path = url.pathname

    // Only apply rate limiting to API routes
    if (!path.startsWith('/api/')) {
      return next()
    }

    // Find the matching rate limit configuration
    const config = findMatchingConfig(path)

    if (!config) {
      // No specific configuration found, proceed normally
      return next()
    }

    // Get client identifier - prefer user ID or IP address
    let identifier =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('cf-connecting-ip') ||
      'anonymous'

    let role = 'anonymous'

    // Try to get user from session
    try {
      const session = await getSession(request)
      if (session?.user?.id) {
        identifier = session.user.id
        role = session.user.role || 'user'
      }
    } catch (error: unknown) {
      logger.warn(
        'Error getting session for rate limiting:',
        error as Record<string, unknown>,
      )
    }

    // Create a composite identifier that includes the API path type
    const compositeIdentifier = `${identifier}:${config.path}`

    // Check rate limit
    const { allowed, limit, remaining, reset } = await rateLimiter.check(
      compositeIdentifier,
      role,
      config.limits,
      config.windowMs,
    )

    // Get response from next middleware
    const response = await next()

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', reset.toString())

    // If rate limit exceeded, return 429 Too Many Requests
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    return response
  },
)
