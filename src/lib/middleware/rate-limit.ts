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
  private readonly defaultLimit: number;
  private readonly windowMs: number;
  private readonly userLimits: Record<string, number>;
  private storage: Map<string, number>;

  constructor(defaultLimit = 30, windowMs = 60 * 1000) {
    this.defaultLimit = defaultLimit;
    this.windowMs = windowMs;
    this.userLimits = {
      admin: 60,
      therapist: 40,
      user: 30,
      anonymous: 15,
    };
    this.storage = new Map<string, number>();
  }

  /**
   * Check if a request is within rate limits
   */
  check(
    key: string,
    role: string,
    limits: Record<string, number>,
    windowMs: number
  ): {
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const limit = limits[role] || limits.anonymous || 10;
    const now = Date.now();
    const resetTime = now + windowMs;

    // Get current count from storage
    const currentCount = this.storage.get(key) || 0;
    
    if (currentCount >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        reset: resetTime
      };
    }

    // Increment count
    this.storage.set(key, currentCount + 1);

    // Set expiry
    setTimeout(() => {
      this.storage.delete(key);
    }, windowMs);

    return {
      allowed: true,
      limit,
      remaining: limit - (currentCount + 1),
      reset: resetTime
    };
  }
}
