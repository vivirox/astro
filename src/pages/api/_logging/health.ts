/**
 * Logging Service Health Check API
 *
 * This endpoint provides health status information for the logging service.
 * It can be used by monitoring tools to verify that the logging system is functioning.
 */

import type { APIRoute } from 'astro'
import { getLogger } from '@/lib/logging'
import { ELKClient } from '@/lib/services/logging'
import { protectRoute } from '@/lib/auth'

const logger = getLogger({ name: 'logging-health' })

export const get: APIRoute = async ({ request }) => {
  // Check if request is authorized for admin health checks
  const authResult = await protectRoute(request, {
    requiredPermissions: ['monitoring:read'],
  })

  if (!authResult.success) {
    // Return minimal info for unauthorized requests (still useful for basic monitoring)
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'logging',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }

  // For authorized requests, perform a more detailed health check

  // Check if ELK is enabled
  const elkEnabled = process.env.ELK_ENABLED === 'true'

  // Check if the ELK server is reachable if enabled
  let elkStatus = 'disabled'
  let elkDetails = null

  if (elkEnabled && process.env.ELK_URL) {
    try {
      // Set up a temporary client just for testing connectivity
      const elkClient = new ELKClient({
        enabled: true,
        url: process.env.ELK_URL,
        indexPrefix: process.env.ELK_INDEX_PREFIX || 'app-logs',
        username: process.env.ELK_USERNAME,
        password: process.env.ELK_PASSWORD,
        apiKey: process.env.ELK_API_KEY,
      })

      // Send a test log entry
      const testResult = await elkClient.log({
        level: 'info',
        message: 'Logging service health check',
        context: {
          source: 'health-check',
          timestamp: new Date().toISOString(),
        },
        tags: ['health-check'],
      })

      // Clean up
      await elkClient.shutdown()

      elkStatus = testResult ? 'connected' : 'error'
      elkDetails = {
        url: maskElkUrl(process.env.ELK_URL),
        indexPrefix: process.env.ELK_INDEX_PREFIX || 'app-logs',
      }
    } catch (error) {
      logger.error('ELK health check failed', error)
      elkStatus = 'error'
      elkDetails = {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Log the health check for audit purposes
  logger.info('Logging service health check executed', {
    elkStatus,
    user: authResult.user?.id,
  })

  return new Response(
    JSON.stringify({
      status: elkStatus === 'error' ? 'degraded' : 'ok',
      service: 'logging',
      timestamp: new Date().toISOString(),
      version: process.env.PUBLIC_APP_VERSION || '0.0.0',
      environment: process.env.NODE_ENV || 'development',
      components: {
        elk: {
          status: elkStatus,
          ...elkDetails,
        },
      },
      user: {
        id: authResult.user?.id,
        email: authResult.user?.email,
      },
    }),
    {
      status: elkStatus === 'error' ? 503 : 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}

/**
 * Mask sensitive parts of the ELK URL for logging and responses
 */
function maskElkUrl(url?: string): string {
  if (!url) return ''

  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.protocol}//${parsedUrl.host}`
  } catch (e) {
    return '[invalid url]'
  }
}
