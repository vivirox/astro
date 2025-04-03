import type { RateLimitConfig } from '../types'

export const rateLimit = {
  /**
   * Check if a request is within rate limits
   */
  check(
    key: string,
    role: string,
    limits: Record<string, number>,
    windowMs: number
  ): {
    allowed: boolean
    limit: number
    remaining: number
    reset: number
  } {
    const limit = limits[role] || limits.anonymous || 10
    const now = Date.now()
    const resetTime = now + windowMs

    // Get current count from storage
    const currentCount = this.storage.get(key) || 0
    
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        reset: resetTime
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
      reset: resetTime
    }
  },

  storage: new Map<string, number>()
}
