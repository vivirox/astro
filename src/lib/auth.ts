import type { AstroCookies } from 'astro'
import { supabase } from './supabase'
import {
  createAuditLog,
  type AuditLogEntry,
  type AuditMetadata,
} from './audit/log'
import {
  authConfig,
  type AuthRole,
  hasRolePrivilege,
} from '../config/auth.config'

export interface AuthUser {
  id: string
  email: string
  role: AuthRole
  fullName?: string | null
  avatarUrl?: string | null
  lastLogin?: Date | null
  metadata?: Record<string, unknown>
}

/**
 * Get the current authenticated user from cookies
 */
export async function getCurrentUser(
  cookies: AstroCookies
): Promise<AuthUser | null> {
  const accessToken = cookies.get(authConfig.cookies.accessToken)?.value
  const refreshToken = cookies.get(authConfig.cookies.refreshToken)?.value

  if (!accessToken || !refreshToken) {
    return null
  }

  try {
    // Set the session using the tokens
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error || !data?.user) {
      console.error('Session error:', error)
      return null
    }

    // Get the user's profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    // Return user with profile data
    return {
      id: data.user.id,
      email: data.user.email || '',
      role: (profileData?.role as AuthRole) || authConfig.roles.default,
      fullName: profileData?.full_name || data.user.user_metadata?.full_name,
      avatarUrl: profileData?.avatar_url || data.user.user_metadata?.avatar_url,
      lastLogin: profileData?.last_login
        ? new Date(profileData.last_login)
        : null,
      metadata: {
        ...data.user.user_metadata,
        ...profileData?.metadata,
      },
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(cookies: AstroCookies): Promise<boolean> {
  const user = await getCurrentUser(cookies)
  return !!user
}

/**
 * Check if the user has the required role
 */
export async function hasRole(
  cookies: AstroCookies,
  requiredRole: AuthRole
): Promise<boolean> {
  const user = await getCurrentUser(cookies)
  if (!user) return false

  return hasRolePrivilege(user.role, requiredRole)
}

/**
 * Log an audit event from auth module
 */
export async function createAuthAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await createAuditLog({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      metadata: entry.metadata,
    })
  } catch (error) {
    console.error('Error logging auth audit event:', error)
  }
}

/**
 * Log an audit event using positional parameters
 */
export async function createAuditLogFromParams(
  userId: string | null,
  action: string,
  resource: string,
  resourceId?: string | null,
  metadata?: AuditMetadata | null
): Promise<void> {
  await createAuditLog({
    userId: userId || undefined,
    action,
    resource,
    resourceId: resourceId || undefined,
    metadata: metadata || undefined,
  })
}

/**
 * Require authentication for a route
 */
export async function requireAuth({
  cookies,
  redirect,
  request,
}: {
  cookies: AstroCookies
  redirect: (url: string) => Response
  request: Request
}) {
  const user = await getCurrentUser(cookies)

  if (!user) {
    const loginUrl = new URL(authConfig.redirects.authRequired, request.url)
    loginUrl.searchParams.set('redirect', request.url)
    return redirect(loginUrl.toString())
  }

  return null
}

/**
 * Require a specific role for a route
 */
export async function requireRole({
  cookies,
  redirect,
  request,
  role,
}: {
  cookies: AstroCookies
  redirect: (url: string) => Response
  request: Request
  role: AuthRole
}) {
  const user = await getCurrentUser(cookies)

  if (!user) {
    const loginUrl = new URL(authConfig.redirects.authRequired, request.url)
    loginUrl.searchParams.set('redirect', request.url)
    return redirect(loginUrl.toString())
  }

  if (!hasRolePrivilege(user.role, role)) {
    return redirect(authConfig.redirects.forbidden)
  }

  return null
}
