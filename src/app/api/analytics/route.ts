import type { NextRequest } from 'next/server'
import process from 'node:process'
import { auth } from '@/lib/auth'
import { CacheInvalidation } from '@/lib/cache/invalidation'
import { fheService as FHE } from '@/lib/fhe'
import { getLogger } from '@/lib/logging'
import { RedisService } from '@/lib/services/redis'
import { z } from 'zod'

const logger = getLogger({ prefix: 'analytics' })

// Initialize Redis service
const redis = new RedisService({
  url: process.env.REDIS_URL!,
  keyPrefix: 'analytics:',
  maxRetries: 3,
  retryDelay: 1000,
  connectTimeout: 5000,
  maxConnections: 10,
  minConnections: 2,
})

// Initialize cache invalidation
const analyticsCache = new CacheInvalidation({
  redis,
  prefix: 'analytics:',
  defaultTTL: 300, // 5 minutes
})

// Schema for analytics event
const AnalyticsEventSchema = z.object({
  type: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
  userId: z.string().optional(),
  sessionId: z.string(),
  metadata: z.record(z.unknown()).optional(),
})

// Schema for analytics query
const AnalyticsQuerySchema = z.object({
  startDate: z.number(),
  endDate: z.number(),
  type: z.string().optional(),
  userId: z.string().optional(),
  groupBy: z.array(z.string()).optional(),
  metrics: z.array(z.string()),
  filters: z.record(z.record(z.unknown())).optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.verifySession(request)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const event = AnalyticsEventSchema.parse(body)

    // Encrypt sensitive data using FHE
    const encryptedData = await FHE.encrypt(JSON.stringify(event.data))
    const analyticsEvent = {
      ...event,
      data: encryptedData,
      userId: event.userId || session.userId,
      timestamp: event.timestamp || Date.now(),
    }

    // Store the event
    await redis.getClient().xadd(
      'analytics_events',
      '*',
      'event',
      JSON.stringify(analyticsEvent),
    )

    // Invalidate relevant caches
    await analyticsCache.invalidatePattern(`type:${event.type}*`)
    if (event.userId) {
      await analyticsCache.invalidatePattern(`user:${event.userId}*`)
    }

    return new Response('OK', { status: 200 })
  }
  catch (error) {
    logger.error('Failed to process analytics event:', { error: error instanceof Error ? error.message : String(error) })
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth.verifySession(request)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = AnalyticsQuerySchema.parse({
      ...searchParams,
      startDate: Number(searchParams.startDate),
      endDate: Number(searchParams.endDate),
      groupBy: searchParams.groupBy?.split(','),
      metrics: searchParams.metrics?.split(',') || [],
    })

    // Generate cache key based on query parameters
    const cacheKey = `query:${JSON.stringify(query)}`

    // Try to get from cache first
    const cachedResult = await analyticsCache.get(cacheKey)
    if (cachedResult) {
      return new Response(JSON.stringify(cachedResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Query analytics data
    const events = await redis.getClient().xrange(
      'analytics_events',
      query.startDate.toString(),
      query.endDate.toString(),
    )

    // Convert Redis response format to expected format
    const formattedEvents = events.map(([id, fields]) => {
      // Convert array of [key1, value1, key2, value2, ...] to Record<string, string>
      const record: Record<string, string> = {}
      for (let i = 0; i < fields.length; i += 2) {
        record[fields[i]] = fields[i + 1]
      }
      return [id, record] as [string, Record<string, string>]
    })

    const results = await processAnalyticsEvents(formattedEvents, query)

    // Cache the results
    await analyticsCache.set(cacheKey, results, {
      pattern: cacheKey,
      ttl: 300,
      tags: [
        'analytics',
        query.type ? `type:${query.type}` : null,
        query.userId ? `user:${query.userId}` : null,
      ].filter((tag): tag is string => tag !== null),
    })

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    logger.error('Failed to retrieve analytics:', { error: error instanceof Error ? error.message : String(error) })
    return new Response('Internal Server Error', { status: 500 })
  }
}

async function processAnalyticsEvents(
  events: [string, Record<string, string>][],
  query: z.infer<typeof AnalyticsQuerySchema>,
) {
  const results: {
    total: number
    metrics: Record<string, number>
    groupedData: Record<string, {
      count: number
      metrics: Record<string, number>
    }>
  } = {
    total: events.length,
    metrics: {},
    groupedData: {},
  }

  for (const [, fields] of events) {
    const event = JSON.parse(fields.event) as {
      data: string
      type: string
      userId?: string
    }

    // Decrypt data using FHE
    const decryptedData = JSON.parse(await FHE.decrypt(event.data)) as Record<string, unknown>

    // Apply filters
    if (query.filters && !matchesFilters(decryptedData, query.filters)) {
      continue
    }

    // Calculate metrics
    for (const metric of query.metrics) {
      const metricValue = Number(decryptedData[metric]) || 0
      results.metrics[metric] = (results.metrics[metric] || 0) + metricValue
    }

    // Group data if groupBy is specified
    if (query.groupBy?.length) {
      const groupKey = query.groupBy
        .map(key => String(decryptedData[key]))
        .join(':')
      results.groupedData[groupKey] = results.groupedData[groupKey] || {
        count: 0,
        metrics: {},
      }
      results.groupedData[groupKey].count++
      for (const metric of query.metrics) {
        const metricValue = Number(decryptedData[metric]) || 0
        results.groupedData[groupKey].metrics[metric]
          = (results.groupedData[groupKey].metrics[metric] || 0) + metricValue
      }
    }
  }

  return results
}

function matchesFilters(
  data: Record<string, unknown>,
  filters: Record<string, Record<string, unknown>>,
): boolean {
  return Object.entries(filters).every(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const operator = Object.keys(value)[0]
      const compareValue = value[operator]
      const dataValue = data[key]

      if (typeof dataValue === 'number' && typeof compareValue === 'number') {
        switch (operator) {
          case '$gt':
            return dataValue > compareValue
          case '$gte':
            return dataValue >= compareValue
          case '$lt':
            return dataValue < compareValue
          case '$lte':
            return dataValue <= compareValue
          case '$ne':
            return dataValue !== compareValue
          case '$in':
            return Array.isArray(compareValue) && compareValue.includes(dataValue)
          default:
            return false
        }
      }
      return false
    }
    return data[key] === value
  })
}
