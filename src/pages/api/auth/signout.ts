import type { APIRoute } from 'astro'
import { createAuditLog } from '../../../lib/audit/log.js'
import { supabase } from '../../../lib/supabase'
import { validateCsrfToken } from '../../../lib/security/csrf'
import { authConfig } from '../../../config/auth.config'

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Validate CSRF token
    const formData = await request.formData();
    const csrfToken = formData.get('csrfToken')?.toString();
    
    if (!validateCsrfToken(cookies, csrfToken)) {
      return new Response('Invalid security token', { status: 403 });
    }

    // Get the current user before signing out for audit logging
    const accessToken = cookies.get(authConfig.cookies.accessToken)?.value
    const refreshToken = cookies.get(authConfig.cookies.refreshToken)?.value

    let userId = null
    if (accessToken && refreshToken) {
      try {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        userId = data?.user?.id
      } catch (error) {
        console.error('Error getting user session:', error)
        // Continue with signout event if we can't get the user ID
      }
    }

    // Sign out the user from Supabase (invalidates the tokens)
    const { error } = await supabase.auth.signOut({
      scope: 'global' // Invalidate all sessions, not just the current one
    })

    if (error) {
      console.error('Sign out error:', error)
      return new Response(error.message, { status: 500 })
    }

    // Clear all authentication cookies
    const cookieOptions = {
      path: authConfig.cookies.path,
      domain: authConfig.cookies.domain,
      secure: authConfig.cookies.secure,
      httpOnly: authConfig.cookies.httpOnly,
      sameSite: authConfig.cookies.sameSite
    };
    
    // Clear the main auth cookies
    cookies.delete(authConfig.cookies.accessToken, cookieOptions)
    cookies.delete(authConfig.cookies.refreshToken, cookieOptions)
    
    // Clear any legacy cookies
    cookies.delete('sb-access-token', { path: '/' })
    cookies.delete('sb-refresh-token', { path: '/' })
    
    // Also clear any CSRF token cookies
    cookies.delete('csrf_token', cookieOptions)

    // Log the sign out for HIPAA compliance
    if (userId) {
      await createAuditLog({
        userId,
        action: 'auth.signout',
        resource: 'auth',
      })
    }

    return redirect('/signin?signedout=true')
  } catch (error) {
    console.error('Sign out error:', error)
    return new Response('An unexpected error occurred', { status: 500 })
  }
}
