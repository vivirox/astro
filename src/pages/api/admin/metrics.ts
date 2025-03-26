import type { APIRoute } from 'astro'
import { AdminPermission, AdminService } from '../../../lib/admin'
import { adminGuard } from '../../../lib/admin/middleware'
import { getLogger } from '../../../lib/logging'

interface AdminLocals {
  admin: {
    userId: string
    isAdmin: boolean
    hasPermission: boolean
  }
}

// Initialize logger
const logger = getLogger()

/**
 * API endpoint for fetching system metrics (admin only)
 * GET /api/admin/metrics
 */
export const GET: APIRoute = async (context) => {
  // Apply admin middleware to check for admin status and required permission
  const middlewareResponse = await adminGuard(AdminPermission.VIEW_METRICS)(
    context,
  )
  if (middlewareResponse) {
    return middlewareResponse
  }

  try {
    // Get admin user ID from middleware context
    const { userId } = (context.locals as AdminLocals).admin

    // Get admin service
    const adminService = AdminService.getInstance()

    // Get system metrics
    const metrics = await adminService.getSystemMetrics()

    // Log access for audi
    logger.info(`Admin user ${userId} accessed system metrics`)

    // Return metrics
    return new Response(JSON.stringify({ success: true, metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    logger.error('Error fetching admin metrics')
    return new Response(JSON.stringify({ error: 'Failed to fetch metrics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
