import type { Session, User } from '@supabase/supabase-js'
// Import necessary libraries and types
import { createClient } from '@supabase/supabase-js'

import { createAuditLog } from '../audit/log.js'

// Extended User interface with permissions
export interface ExtendedUser extends User {
  permissions?: string[]
}

export interface SessionData {
  user: ExtendedUser
  session: Session
}

/**
 * Get the current session
 * @param request The request object from the API route
 * @returns The session data or null if not authenticated
 */
export async function getSession(
  request: Request,
): Promise<SessionData | null> {
  try {
    console.log('Processing request:', request.url)
    // Create a Supabase client
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    )

    // Get the session from the session cookie
    const { data, error } = await supabase.auth.getSession()

    if (error || !data?.session) {
      console.log('Error getting session:', error)
      return null
    }

    // Return the session data
    return {
      user: data?.session.user as ExtendedUser,
      session: data?.session,
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Create a new session
 * @param user The user to create a session for
 * @returns The session data
 */
export async function createSession(user: User): Promise<SessionData | null> {
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    )

    // Create a new session
    const { data, error } = await supabase.auth.refreshSession()

    if (error || !data?.session) {
      return null
    }

    // Log the session creation
    await createAuditLog(
      'session_created',
      user.id,
      data?.session.access_token.substring(0, 8),
      'session',
      {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    )

    // Return the session data
    return {
      user: data?.session.user,
      session: data?.session,
    }
  } catch (error) {
    console.error('Error creating session:', error)
    return null
  }
}

/**
 * End the current session
 * @param sessionId The session ID to end
 * @param userId The user ID associated with the session
 */
export async function endSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    )

    // Sign out the user
    await supabase.auth.signOut()

    // Log the session end
    await createAuditLog('session_destroyed', userId, sessionId, 'session', {
      reason: 'user_logout',
    })
  } catch (error) {
    console.error('Error ending session:', error)
  }
}
