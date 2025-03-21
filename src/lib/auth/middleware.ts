import { getSession } from './session'
import { zkAuth } from './zkAuth'
import type { AuthContext } from './types'

/**
 * Middleware to verify ZK proof for session
 */
export const verifyZKProof = async (request: Request, context: AuthContext) => {
  try {
    // Get the session from the context
    const session = await getSession(request)

    if (!session) {
      return new Response(JSON.stringify({ error: 'No session found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Check if the session has a ZK proof
    if (!session.user.app_metadata?.proof) {
      return new Response(
        JSON.stringify({ error: 'No ZK proof found in session' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify the ZK proof
    const verificationResult = await zkAuth.verifySessionProofWithZK({
      sessionId: session.session.access_token,
      userId: session.user.id,
      startTime: Date.now(),
      expiresAt: Date.now() + (session.session.expires_in || 3600) * 1000,
      proof: session.user.app_metadata.proof,
      metadata: session.user.app_metadata,
    })

    if (!verificationResult.isValid) {
      return new Response(JSON.stringify({ error: 'Invalid ZK proof' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Add verification result to the context
    context.zkVerification = verificationResult

    // Continue to the next middleware or route handler
    return null
  } catch (error) {
    console.error('ZK proof verification error:', error)
    return new Response(
      JSON.stringify({ error: 'ZK proof verification failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

/**
 * Middleware to verify admin access
 */
export const verifyAdmin = async (request: Request, context: AuthContext) => {
  try {
    // Get the session from the context
    const session = await getSession(request)

    if (!session) {
      return new Response(JSON.stringify({ error: 'No session found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify admin role
    if (session.user?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Continue to the next middleware or route handler
    return null
  } catch (error) {
    console.error('Admin verification error:', error)
    return new Response(
      JSON.stringify({ error: 'Admin verification failed' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
