import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { createCacheInvalidation } from '@/lib/cache/invalidation'
import { FHE } from '@/lib/fhe'
import { logger } from '@/lib/logger'
import { redis } from '@/lib/redis'
import { z } from 'zod'

const analyticsCache = createCacheInvalidation({
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
  filters: z.record(z.unknown()).optional(),
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
    const encryptedData = await FHE.encrypt(event.data)
    const analyticsEvent = {
      ...event,
      data: encryptedData,
      userId: event.userId || session.userId,
      timestamp: event.timestamp || Date.now(),
    }

    // Store the event
    await redis.xadd(
      'analytics_events',
      '*',
      'event',
      JSON.stringify(analyticsEvent),
    )

    // Invalidate relevant caches
    await analyticsCache.invalidateTag(`type:${event.type}`)
    if (event.userId) {
      await analyticsCache.invalidateTag(`user:${event.userId}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    logger.error('Failed to process analytics event:', error)
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
      metrics: searchParams.metrics.split(','),
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
    const events = await redis.xrange(
      'analytics_events',
      query.startDate.toString(),
      query.endDate.toString(),
    )

    // Process and aggregate events
    const results = await processAnalyticsEvents(events, query)

    // Cache the results
    await analyticsCache.set(cacheKey, results, {
      pattern: cacheKey,
      ttl: 300,
      tags: [
        'analytics',
        query.type && `type:${query.type}`,
        query.userId && `user:${query.userId}`,
      ].filter(Boolean),
    })

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('Failed to retrieve analytics:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

async function processAnalyticsEvents(
  events: any[],
  query: z.infer<typeof AnalyticsQuerySchema>,
) {
  const results = {
    total: events.length,
    metrics: {},
    groupedData: {},
  }

  for (const [, fields] of events) {
    const event = JSON.parse(fields.event)

    // Decrypt data using FHE
    const decryptedData = await FHE.decrypt(event.data)

    // Apply filters
    if (query.filters && !matchesFilters(decryptedData, query.filters)) {
      continue
    }

    // Calculate metrics
    for (const metric of query.metrics) {
      results.metrics[metric] =
        (results.metrics[metric] || 0) + (decryptedData[metric] || 0)
    }

    // Group data if groupBy is specified
    if (query.groupBy?.length) {
      const groupKey = query.groupBy.map((key) => decryptedData[key]).join(':')
      results.groupedData[groupKey] = results.groupedData[groupKey] || {
        count: 0,
        metrics: {},
      }
      results.groupedData[groupKey].count++
      for (const metric of query.metrics) {
        results.groupedData[groupKey].metrics[metric] =
          (results.groupedData[groupKey].metrics[metric] || 0) +
          (decryptedData[metric] || 0)
      }
    }
  }

  return results
}

function matchesFilters(data: any, filters: Record<string, unknown>): boolean {
  return Object.entries(filters).every(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const operator = Object.keys(value)[0]
      const compareValue = value[operator]
      switch (operator) {
        case '$gt':
          return data[key] > compareValue
        case '$gte':
          return data[key] >= compareValue
        case '$lt':
          return data[key] < compareValue
        case '$lte':
          return data[key] <= compareValue
        case '$ne':
          return data[key] !== compareValue
        case '$in':
          return Array.isArray(compareValue) && compareValue.includes(data[key])
        default:
          return false
      }
    }
    return data[key] === value
  })
}
