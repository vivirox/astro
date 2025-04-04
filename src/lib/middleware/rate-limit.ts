




// Initialize logger


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


/**
 * Redis-based rate limiter implementation
 */
export class RateLimiter {
  private readonly defaultLimit: number
  private readonly windowMs: number
  private readonly userLimits: Record<string, number>
  private storage: Map<string, number>

  constructor(defaultLimit = 30, windowMs = 60 * 1000) {
    this.defaultLimit = defaultLimit
    this.windowMs = windowMs
    this.userLimits = {
      admin: 60,
      therapist: 40,
      user: 30,
      anonymous: 15,
    }
    this.storage = new Map<string, number>()
  }

  /**
   * Check if a request is within rate limits
   */
  check(
    key: string,
    role: string = 'anonymous',
    limits: Record<string, number> = {},
    windowMs: number = this.windowMs,
  ): {
    allowed: boolean
    limit: number
    remaining: number
    reset: number
  } {
    // Use provided limits or default to userLimits
    const effectiveLimits =
      Object.keys(limits).length > 0 ? limits : this.userLimits
    const limit =
      effectiveLimits[role] || effectiveLimits.anonymous || this.defaultLimit
    const now = Date.now()
    const resetTime = now + windowMs

    // Get current count from storage
    const currentCount = this.storage.get(key) || 0

    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        reset: resetTime,
      }
    }

    // Increment count
    this.storage.set(key, currentCount + 1)

    // Set expiry
    setTimeout(() => {
      this.storage.delete(key)
    }, windowMs)

    return {
      allowed: true,
      limit,
      remaining: limit - (currentCount + 1),
      reset: resetTime,
    }
  }
}

/**
 * Default rate limiter instance for the application
 */
export const rateLimit = new RateLimiter()
