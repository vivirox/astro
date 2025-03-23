import { defineMiddleware } from 'astro:middleware'
import { getSession } from '../auth/session'
import { getLogger } from '../logging'

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

// Simple in-memory rate limiter implementation
// In production, this should be replaced with a Redis-based solution
export class RateLimiter {
  private storage: Map<string, { count: number; resetTime: number }> = new Map<
    string,
    { count: number; resetTime: number }
  >()
  private readonly defaultLimit: number
  private readonly windowMs: number
  private readonly userLimits: Record<string, number> = {
    admin: 60, // 60 requests per minute for admins
    user: 30, // 30 requests per minute for regular users
    anonymous: 15, // 15 requests per minute for unauthenticated users
  }

  constructor(defaultLimit = 30, windowMs = 60 * 1000) {
    this.defaultLimit = defaultLimit
    this.windowMs = windowMs
  }

  /**
   * Check if a request from the specified identifier is rate limited
   */
  public check(
    identifier: string,
    role = 'anonymous',
    pathSpecificLimits?: Record<string, number>,
    customWindowMs?: number
  ): { allowed: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now()
    // Create a compound key that includes the path information
    const hasPathSpecificLimits = !!pathSpecificLimits
    const storageKey = hasPathSpecificLimits
      ? `${identifier}:path_specific`
      : identifier

    const entry = this.storage.get(storageKey)
    // Use path-specific limits if provided, otherwise use default
    const limit =
      pathSpecificLimits?.[role] || this.userLimits[role] || this.defaultLimit
    const windowMs = customWindowMs || this.windowMs

    // If no entry exists or the entry has expired, create a new one
    if (!entry || entry.resetTime <= now) {
      const resetTime = now + windowMs
      this.storage.set(storageKey, { count: 1, resetTime })
      return { allowed: true, limit, remaining: limit - 1, reset: resetTime }
    }

    // Check if the entry has reached its limit
    if (entry.count >= limit) {
      return { allowed: false, limit, remaining: 0, reset: entry.resetTime }
    }

    // Increment the count
    entry.count += 1
    this.storage.set(storageKey, entry)

    return {
      allowed: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetTime,
    }
  }

  /**
   * Clean up expired entries
   */
  public cleanup(): void {
    const now = Date.now()
    for (const [identifier, entry] of this.storage.entries()) {
      if (entry.resetTime <= now) {
        this.storage.delete(identifier)
      }
    }
  }
}

// Create a rate limiter instance
const rateLimiter = new RateLimiter()

// Schedule cleanup to run every minute
setInterval(() => {
  rateLimiter.cleanup()
}, 60 * 1000)

/**
 * Find the matching rate limit configuration for a given path
 */
function findMatchingConfig(path: string): RateLimitConfig | undefined {
  // Sort configs by specificity (longest path first)
  const sortedConfigs = [...rateLimitConfigs].sort(
    (a, b) => b.path.length - a.path.length
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
    } catch (error) {
      logger.warn('Error getting session for rate limiting:', error)
    }

    // Create a composite identifier that includes the API path type
    const compositeIdentifier = `${identifier}:${config.path}`

    // Check rate limit
    const { allowed, limit, remaining, reset } = rateLimiter.check(
      compositeIdentifier,
      role,
      config.limits,
      config.windowMs
    )

    if (!allowed) {
      logger.warn('Rate limit exceeded', {
        path,
        identifier,
        role,
        limit,
      })

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
        }
      )
    }

    // Process the request
    const response = await next()

    // Add rate limit headers to the response
    response?.headers.set('X-RateLimit-Limit', limit.toString())
    response?.headers.set('X-RateLimit-Remaining', remaining.toString())
    response?.headers.set('X-RateLimit-Reset', reset.toString())

    return response
  }
)

// Export the instance for direct use in API routes
export const rateLimit = rateLimiter
