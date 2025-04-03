import type { APIRoute } from 'astro'
import { protectRoute } from '../../../lib/auth/serverAuth'
import { testSecurityAlert } from '../../../lib/auth/supabase'
import { getLogger } from '../../../lib/logging'

const logger = getLogger('security-admin')

export const POST: APIRoute = async (context) => {
  // Validate admin access
  const { authorized, user } = await protectRoute(context, ['admin'])

  if (!authorized || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get request body
    const body = await context.request.json()
    const alertType = body.alertType || 'suspicious_login'

    // Validate alert type
    if (
      !['suspicious_login', 'password_reset', 'account_locked'].includes(
        alertType,
      )
    ) {
      return new Response(
        JSON.stringify({
          error: 'Invalid alert type',
          message:
            'Alert type must be one of: suspicious_login, password_reset, account_locked',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Test the security alert
    const success = await testSecurityAlert(
      alertType as 'suspicious_login' | 'password_reset' | 'account_locked',
    )

    if (!success) {
      throw new Error('Failed to send test alert')
    }

    // Log the test
    logger.info(`Security alert test initiated by admin`, {
      userId: user.id,
      alertType,
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test ${alertType} alert sent successfully`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    logger.error('Error testing security alert', {
      error: errorMessage,
      userId: user?.id,
    })

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
