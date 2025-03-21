import { defineMiddleware } from 'astro:middleware'
import { getSession } from '../auth/session'

// Simple in-memory rate limiter implementation
// In production, this should be replaced with a Redis-based solution
class RateLimiter {
  private storage: Map<string, { count: number; resetTime: number }> = new Map()
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
    role = 'anonymous'
  ): { allowed: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now()
    const entry = this.storage.get(identifier)
    const limit = this.userLimits[role] || this.defaultLimit

    // If no entry exists or the entry has expired, create a new one
    if (!entry || entry.resetTime <= now) {
      const resetTime = now + this.windowMs
      this.storage.set(identifier, { count: 1, resetTime })
      return { allowed: true, limit, remaining: limit - 1, reset: resetTime }
    }

    // Check if the entry has reached its limit
    if (entry.count >= limit) {
      return { allowed: false, limit, remaining: 0, reset: entry.resetTime }
    }

    // Increment the count
    entry.count += 1
    this.storage.set(identifier, entry)

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
 * Rate limiting middleware
 * Restricts the number of requests a client can make in a given time window
 */
export const rateLimitMiddleware = defineMiddleware(
  async ({ request }, next) => {
    // Only apply rate limiting to AI API routes
    if (!request.url.includes('/api/ai/')) {
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
      console.warn('Error getting session for rate limiting:', error)
    }

    // Check rate limit
    const { allowed, limit, remaining, reset } = rateLimiter.check(
      identifier,
      role
    )

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
