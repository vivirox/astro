import type { APIRoute } from 'astro'
import { AdminService } from '../../../lib/admin'
import { AdminPermission } from '../../../lib/admin'
import { adminGuard } from '../../../lib/admin/middleware'
import { getLogger } from '../../../lib/logging'

// Initialize logger
const logger = getLogger()

/**
 * API endpoint for fetching users (admin only)
 * GET /api/admin/users
 */
export const GET: APIRoute = async (context) => {
  // Apply admin middleware to check for admin status and required permission
  const middlewareResponse = await adminGuard(AdminPermission.VIEW_USERS)(
    context
  )
  if (middlewareResponse) {
    return middlewareResponse
  }

  try {
    // Get admin user ID from middleware context
    const { userId } = context.locals.admin

    // Parse query parameters for pagination and filtering
    const url = new URL(context.request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const role = url.searchParams.get('role') || undefined

    // Get admin service
    const adminService = AdminService.getInstance()

    // Get users with pagination and filtering
    const usersResult = await adminService.getUsers({ limit, offset, role })

    // Log access for audi
    logger.info(`Admin user ${userId} accessed user list`)

    // Return users with pagination info
    return new Response(
      JSON.stringify({
        success: true,
        users: usersResult.users,
        pagination: {
          total: usersResult.total,
          limit,
          offset,
          hasMore: offset + limit < usersResult.total,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logger.error('Error fetching users:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * API endpoint for updating a user (admin only)
 * PATCH /api/admin/users
 */
export const PATCH: APIRoute = async (context) => {
  // Apply admin middleware to check for admin status and required permission
  const middlewareResponse = await adminGuard(AdminPermission.MANAGE_USERS)(
    context
  )
  if (middlewareResponse) {
    return middlewareResponse
  }

  try {
    // Get admin user ID from middleware context
    const { userId: adminId } = context.locals.admin

    // Parse the request body
    const requestData = await context.request.json()
    const { userId, updates } = requestData

    if (!userId || !updates) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get admin service
    const adminService = AdminService.getInstance()

    // Update the user
    const updatedUser = await adminService.updateUser(userId, updates)

    // Log access for audi
    logger.info(`Admin user ${adminId} updated user ${userId}`)

    // Return updated user
    return new Response(JSON.stringify({ success: true, user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('Error updating user:', error)
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
