import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import { createAuditLog } from '../audit/log';

// Define session type
export interface SessionData {
  user: User;
  session: Session;
}

/**
 * Get the current session from the request
 * @param request The incoming request
 * @returns The session data or null if not authenticated
 */
export async function getSession(request: Request): Promise<SessionData | null> {
  try {
    // Get the session cookie
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Get the session from the request cookie
    const { data, error } = await supabase.auth.getSession();
    
    if (error || !data.session) {
      return null;
    }

    // Return the session data
    return {
      user: data.session.user,
      session: data.session
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
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
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Create a new session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      return null;
    }

    // Log the session creation
    await createAuditLog({
      userId: user.id,
      action: 'auth.session.created',
      resource: 'session',
      metadata: {
        sessionId: data.session.access_token.substring(0, 8) // Use part of the access token as a session identifier
      }
    });

    // Return the session data
    return {
      user: data.session.user,
      session: data.session
    };
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * End the current session
 * @param sessionId The session ID to end
 * @param userId The user ID associated with the session
 */
export async function endSession(sessionId: string, userId: string): Promise<void> {
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Sign out
    await supabase.auth.signOut();

    // Log the session end
    await createAuditLog({
      userId,
      action: 'auth.session.ended',
      resource: 'session',
      metadata: {
        sessionId
      }
    });
  } catch (error) {
    console.error('Error ending session:', error);
  }
} 