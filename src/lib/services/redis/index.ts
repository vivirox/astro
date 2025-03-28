import Redis from 'ioredis'

interface RedisServiceConfig {
  url: string
  keyPrefix?: string
  maxRetries?: number
  retryDelay?: number
  connectTimeout?: number
  maxConnections?: number
  minConnections?: number
}

export class RedisService {
  getClient(): Redis {
    return this.client
  }

  private client: Redis

  constructor(config: RedisServiceConfig) {
    this.client = new Redis(config.url, {
      keyPrefix: config.keyPrefix,
      maxRetriesPerRequest: config.maxRetries,
    })
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlMs?: number): Promise<string> {
    if (ttlMs) {
      return this.client.set(key, value, 'PX', ttlMs)
    }
    return this.client.set(key, value)
  }

  async del(key: string): Promise<number> {
    return this.client.del(key)
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values)
  }

  async rpoplpush(source: string, destination: string): Promise<string | null> {
    return this.client.rpoplpush(source, destination)
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.client.lrem(key, count, value)
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key)
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value)
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field)
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    const result = await this.client.hgetall(key)
    return Object.keys(result).length > 0 ? result : null
  }

  async xadd(
    key: string,
    id: string,
    field: string,
    value: string,
  ): Promise<string | null> {
    const result = await this.client.xadd(key, id, field, value)
    return result
  }

  async xrange(
    key: string,
    start: string,
    end: string,
  ): Promise<Array<[string, Record<string, string>]>> {
    const results = await this.client.xrange(key, start, end)
    // Transform the results to match the expected return type
    return results.map(([id, fields]) => {
      // Convert array of fields to Record<string, string>
      const record: Record<string, string> = {}
      for (let i = 0; i < fields.length; i += 2) {
        record[fields[i]] = fields[i + 1]
      }
      return [id, record]
    })
  }
}

// Export a singleton instance
export const redis = new RedisService({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  keyPrefix: process.env.REDIS_PREFIX || '',
  maxRetries: 3,
})
