import { type APIRoute } from 'astro'
import { getSession } from '../../../lib/auth/session.js'
import { aiRepository } from '../../../lib/db/ai/index.js'
import { createAuditLog } from '../../../lib/audit/log.js'

export const GET: APIRoute = async ({ request, url }) => {
  let session

  try {
    // Verify session
    session = await getSession(request)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if user has admin permissions
    if (session?.user?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse query parameters
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)

    // Log the request
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.crisis.high-risk.request',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        limit,
        offset,
      },
    })

    // Retrieve high-risk crisis detections
    const detections = await aiRepository.getHighRiskCrisisDetections(
      limit,
      offset
    )

    // Return the results
    return new Response(JSON.stringify({ detections }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error retrieving high-risk crisis detections:', error)
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error?.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
