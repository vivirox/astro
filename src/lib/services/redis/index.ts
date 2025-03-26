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
    throw new Error('Method not implemented.')
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

  async xadd(key: string, id: string, field: string, value: string): Promise<string | null> {
    const result = await this.client.xadd(key, id, field, value)
    return result
  }

  async xrange(key: string, start: string, end: string): Promise<Array<[string, Record<string, string>]>> {
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
