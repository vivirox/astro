import type { APIRoute } from 'astro'
import { getSession } from '../../../lib/auth/session'
import { requirePermission } from '../../../lib/access-control'
import { createAuditLog } from '../../../lib/audit/log'
import { handleApiError } from '../../../lib/ai/error-handling'
import { getAIUsageStats } from '../../../lib/ai/analytics'

/**
 * API route for AI usage statistics
 */
export const GET: APIRoute = async ({ request, cookies, url }) => {
  let session

  try {
    // Verify session and permissions
    session = await getSession(request)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Check if user has admin permission
    const checkPermission = requirePermission('read:admin')
    const permissionResponse = await checkPermission({
      cookies,
      redirect: (path: string) => new Response(null, { status: 401 }),
      request,
    })

    if (permissionResponse) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Get query parameters
    const period = url.searchParams.get('period') || 'daily'
    const allUsers = url.searchParams.get('allUsers') === 'true'
    const userId = allUsers ? undefined : session?.user?.id

    // Get usage statistics
    const stats = await getAIUsageStats({
      period: period as 'daily' | 'weekly' | 'monthly',
      userId,
    })

    // Create audit log for the request
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.stats.view',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        period,
        allUsers,
        statsCount: stats.length,
      },
    })

    return new Response(JSON.stringify({ stats }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    })
  } catch (error) {
    console.error('Error in AI usage stats API:', error)

    // Create audit log for the error
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.stats.error',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        error: error instanceof Error ? error?.message : String(error),
      },
    })

    // Use the standardized error handling
    return handleApiError(error)
  }
}
