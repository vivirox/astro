import type { APIRoute } from 'astro'
import { getSession } from '../../../lib/auth/session'
import { getAIUsageStats } from '../../../lib/ai/analytics'
import { createAuditLog, type AuditMetadata } from '@/lib/audit/log'
import { handleApiError } from '../../../lib/ai/error-handling'
import { validateQueryParams } from '../../../lib/validation/index'
import { UsageStatsRequestSchema } from '../../../lib/validation/schemas'

/**
 * API route for AI usage statistics
 * Secured by authentication and input validation
 * Rate limited to prevent abuse
 */
export const GET: APIRoute = async ({ request }) => {
  let session

  try {
    // Verify session
    session = await getSession(request)
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Check if user has admin access for all users data
    const isAdmin = session?.user?.role === 'admin'

    // Validate query parameters
    const [params, validationError] = validateQueryParams(
      new URL(request.url),
      UsageStatsRequestSchema
    )

    if (validationError) {
      // Create audit log for validation error
      await createAuditLog({
        userId: session?.user?.id || 'anonymous',
        action: 'ai.usage.validation_error',
        resource: 'ai',
        resourceId: undefined,
        metadata: {
          error: validationError.error,
          details: JSON.stringify(validationError.details),
          status: 'error',
        } as AuditMetadata,
      })

      return new Response(JSON.stringify(validationError), {
        status: validationError.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Only allow admins to view all users' data
    if (params!.allUsers && !isAdmin) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to view all users data',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Create audit log for the request
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.usage.request',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        period: params!.period,
        allUsers: params!.allUsers,
        startDate: params!.startDate,
        endDate: params!.endDate,
        status: 'success',
      },
    })

    // Get usage statistics
    const stats = await getAIUsageStats({
      period: params!.period,
      userId: params!.allUsers ? undefined : session?.user?.id,
      startDate: params!.startDate ? new Date(params!.startDate) : undefined,
      endDate: params!.endDate ? new Date(params!.endDate) : undefined,
    })

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      },
    })
  } catch (error) {
    console.error('Error in AI usage API:', error)

    // Create audit log for the error
    await createAuditLog({
      userId: session?.user?.id || 'anonymous',
      action: 'ai.usage.error',
      resource: 'ai',
      resourceId: undefined,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        status: 'error',
      },
    })

    // Use standardized error handling
    return handleApiError(error)
  }
}
