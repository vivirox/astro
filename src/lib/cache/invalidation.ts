import type { Redis } from 'ioredis'
import { logger } from '@/lib/logger'

interface InvalidationRule {
  pattern: string
  ttl?: number
  dependencies?: string[]
  tags?: string[]
}

interface InvalidationOptions {
  redis: Redis
  prefix?: string
  defaultTTL?: number
}

export class CacheInvalidation {
  private redis: Redis
  private prefix: string
  private defaultTTL: number

  constructor(options: InvalidationOptions) {
    this.redis = options.redis
    this.prefix = options.prefix || 'cache:'
    this.defaultTTL = options.defaultTTL || 3600 // 1 hour
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`
  }

  private getTagKey(tag: string): string {
    return `${this.prefix}tag:${tag}`
  }

  private getDependencyKey(dependency: string): string {
    return `${this.prefix}dep:${dependency}`
  }

  async set(
    key: string,
    value: unknown,
    rule?: InvalidationRule,
  ): Promise<void> {
    try {
      const cacheKey = this.getKey(key)
      const serializedValue = JSON.stringify(value)

      // Start a Redis transaction
      const multi = this.redis.multi()

      // Set the cache value with TTL
      const ttl = rule?.ttl || this.defaultTTL
      multi.setex(cacheKey, ttl, serializedValue)

      // Add tags if specified
      if (rule?.tags?.length) {
        for (const tag of rule.tags) {
          const tagKey = this.getTagKey(tag)
          multi.sadd(tagKey, cacheKey)
          multi.expire(tagKey, ttl)
        }
      }

      // Add dependencies if specified
      if (rule?.dependencies?.length) {
        for (const dependency of rule.dependencies) {
          const depKey = this.getDependencyKey(dependency)
          multi.sadd(depKey, cacheKey)
          multi.expire(depKey, ttl)
        }
      }

      // Execute the transaction
      await multi.exec()
    } catch (error) {
      logger.error('Failed to set cache:', error)
      throw error
    }
  }

  async get(key: string): Promise<unknown | null> {
    try {
      const cacheKey = this.getKey(key)
      const value = await this.redis.get(cacheKey)
      return value ? JSON.parse(value) : null
    } catch (error) {
      logger.error('Failed to get cache:', error)
      throw error
    }
  }

  async invalidateKey(key: string): Promise<void> {
    try {
      const cacheKey = this.getKey(key)
      await this.redis.del(cacheKey)
    } catch (error) {
      logger.error('Failed to invalidate cache key:', error)
      throw error
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(this.getKey(pattern))
      if (keys.length) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      logger.error('Failed to invalidate cache pattern:', error)
      throw error
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    try {
      const tagKey = this.getTagKey(tag)
      const keys = await this.redis.smembers(tagKey)

      if (keys.length) {
        const multi = this.redis.multi()
        multi.del(...keys)
        multi.del(tagKey)
        await multi.exec()
      }
    } catch (error) {
      logger.error('Failed to invalidate cache tag:', error)
      throw error
    }
  }

  async invalidateDependency(dependency: string): Promise<void> {
    try {
      const depKey = this.getDependencyKey(dependency)
      const keys = await this.redis.smembers(depKey)

      if (keys.length) {
        const multi = this.redis.multi()
        multi.del(...keys)
        multi.del(depKey)
        await multi.exec()
      }
    } catch (error) {
      logger.error('Failed to invalidate cache dependency:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`)
      if (keys.length) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      logger.error('Failed to clear cache:', error)
      throw error
    }
  }

  async refresh(
    key: string,
    getValue: () => Promise<unknown>,
    rule?: InvalidationRule,
  ): Promise<unknown> {
    try {
      const value = await getValue()
      await this.set(key, value, rule)
      return value
    } catch (error) {
      logger.error('Failed to refresh cache:', error)
      throw error
    }
  }

  async getOrSet(
    key: string,
    getValue: () => Promise<unknown>,
    rule?: InvalidationRule,
  ): Promise<unknown> {
    try {
      const cached = await this.get(key)
      if (cached !== null) {
        return cached
      }

      const value = await getValue()
      await this.set(key, value, rule)
      return value
    } catch (error) {
      logger.error('Failed to get or set cache:', error)
      throw error
    }
  }
}

export function createCacheInvalidation(
  options: InvalidationOptions,
): CacheInvalidation {
  return new CacheInvalidation(options)
}
