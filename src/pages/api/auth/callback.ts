import type { APIRoute } from 'astro'
import { createAuditLog } from '../../../lib/audit/log.js'
import { supabase } from '../../../lib/supabase'

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const authCode = url.searchParams.get('code')

  if (!authCode) {
    return new Response('No code provided', { status: 400 })
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(authCode)

    if (error) {
      console.error('Auth callback error:', error)
      return new Response(error?.message, { status: 500 })
    }

    const { access_token, refresh_token } = data?.session
    const { user } = data

    // Set cookies for session management
    cookies.set('sb-access-token', access_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
    })

    cookies.set('sb-refresh-token', refresh_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600, // 7 days
    })

    // Check if user has a profile, create one if no
    if (user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned"
        console.error('Profile fetch error:', profileError)
      }

      if (!profileData) {
        // Create a profile for the user
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata.full_name || null,
          avatar_url: user.user_metadata.avatar_url || null,
          role: 'user',
        })

        if (insertError) {
          console.error('Profile creation error:', insertError)
          // Continue anyway, as the auth record was created
        }
      }

      // Log the sign in for HIPAA compliance
      await createAuditLog({
        userId: user.id,
        action: 'auth.signin.oauth',
        resource: 'auth',
        metadata: {
          email: user.email,
          provider: user.app_metadata.provider,
        },
      })
    }

    return redirect('/dashboard')
  } catch (error) {
    console.error('Auth callback error:', error)
    return new Response('An unexpected error occurred', { status: 500 })
  }
}
