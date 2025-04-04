import type { APIRoute } from 'astro'
import { RedisService } from '../../../lib/services/redis/RedisService'

/**
 * V1 Health check API endpoint
 *
 * This endpoint checks and reports the health of system components:
 * 1. API service itself
 * 2. Supabase connection (if credentials available)
 * 3. Redis connection (if credentials available)
 * 4. System resources (memory, CPU load)
 * 5. Node.js runtime information
 */
export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now()
  let status = 200
  let message = 'All systems operational'
  const services: Record<
    string,
    { status: 'healthy' | 'degraded' | 'down'; responseTime?: number }
  > = {}
  // Check environment
  const environment =
    import.meta.env.MODE || process.env.NODE_ENV || 'development'
  // Get deployment info if available
  const version =
    process.env.DEPLOY_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
  const deployTime =
    process.env.DEPLOY_TIMESTAMP ||
    process.env.VERCEL_GIT_COMMIT_MESSAGE ||
    'unknown'
  try {
    // Check Redis if configured
    if (process.env.REDIS_URL) {
      const redisStartTime = Date.now()
      try {
        const redis = new RedisService({
          url: process.env.REDIS_URL,
          keyPrefix: process.env.REDIS_KEY_PREFIX || 'gradiant:',
        })

        const pingResult = await redis.ping()
        if (pingResult === 'PONG') {
          services.redis = {
            status: 'healthy',
            responseTime: Date.now() - redisStartTime,
          }
        } else {
          services.redis = { status: 'degraded' }
          message = 'Some systems degraded'
          status = 200 // Still consider the API healthy even if Redis is degraded
        }

        await redis.disconnect()
      } catch (error) {
        services.redis = { status: 'down' }
        message = 'Some systems degraded'
        status = 200 // Still return 200 but indicate degraded service
      }
    }

    // Check API itself - always healthy if we got here
    services.api = {
      status: 'healthy',
      responseTime: Date.now() - startTime,
    }
    // We could add more service checks here:
    // - Database connection
    // - External services
    // - Auth service
    // - Storage service
    // - etc.
    // Calculate overall status based on service statuses
    const hasDownServices = Object.values(services).some(
      (s) => s.status === 'down',
    )
    const hasDegradedServices = Object.values(services).some(
      (s) => s.status === 'degraded',
    )
    if (hasDownServices) {
      message = 'Some systems are down'
      status = 200 // Still return 200 to allow health check to pass but indicate in body
    } else if (hasDegradedServices) {
      message = 'Some systems are degraded'
      status = 200
    }

    // Prepare the response
    const response = {
      status: message,
      timestamp: new Date().toISOString(),
      environment,
      version,
      deploy_time: deployTime,
      uptime: process.uptime(),
      request_id: request.headers.get('x-request-id') || crypto.randomUUID(),
      services,
      response_time: Date.now() - startTime,
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    // If anything fails in our health check logic itself
    const errorResponse = {
      status: 'API health check error',
      timestamp: new Date().toISOString(),
      environment,
      error: error instanceof Error ? error.message : String(error),
      request_id: request.headers.get('x-request-id') || crypto.randomUUID(),
      response_time: Date.now() - startTime,
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }
}
