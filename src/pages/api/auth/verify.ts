import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { createResourceAuditLog } from '../../../lib/audit/log';

/**
 * API endpoint to verify authentication tokens
 * 
 * This endpoint validates an access token and returns the associated user
 * if the token is valid. Used by the API auth middleware for protecting routes.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the token from the request body
    const body = await request.json();
    const { token } = body;

    if (!token) {
      // Log failed verification attempt
      await createResourceAuditLog(
        'token_verification_failed',
        'system',
        { id: request.url, type: 'api' },
        {
          reason: 'missing_token',
          ipAddress: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return new Response(
        JSON.stringify({ error: 'No token provided' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify the token using Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      // Log failed verification attempt
      await createResourceAuditLog(
        'token_verification_failed',
        'system',
        { id: request.url, type: 'api' },
        {
          reason: 'invalid_token',
          error: authError?.message,
          ipAddress: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return new Response(
        JSON.stringify({ error: 'Invalid token', details: authError?.message }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user profile data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Map the user data to our AuthUser format
    const user = {
      id: authData.user.id,
      email: authData.user.email || '',
      role: (profileData?.role) || 'guest',
      fullName: profileData?.full_name || authData.user.user_metadata?.full_name,
      avatarUrl: profileData?.avatar_url || authData.user.user_metadata?.avatar_url,
      lastLogin: profileData?.last_login
        ? new Date(profileData.last_login)
        : null,
      metadata: {
        ...authData.user.user_metadata,
        ...profileData?.metadata,
      },
    };

    // Log successful verification
    await createResourceAuditLog(
      'token_verification_success',
      user.id,
      { id: request.url, type: 'api' },
      {
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    );

    return new Response(
      JSON.stringify({ data: { user } }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Token verification error:', error);

    // Log error
    await createResourceAuditLog(
      'token_verification_error',
      'system',
      { id: request.url, type: 'api' },
      {
        error: error instanceof Error ? error.message : String(error),
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      }
    );

    return new Response(
      JSON.stringify({ error: 'Server error during token verification' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};