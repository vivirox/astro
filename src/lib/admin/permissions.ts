import type { AdminPermission } from './types'
import type { AuthUser } from '@/lib/auth/types'


/**
 * Check if a user has the specified admin permission
 */
export function hasPermission(
  user: AuthUser | null | undefined,
  permission: AdminPermission,
): boolean {
  // If no user, return false
  if (!user || !user.id) {
    return false
  }

  // This is a synchronous wrapper, so we'll assume permission
  // is granted for users with admin role. In a real implementation,
  // you'd want to check session data or use a pre-computed permissions list.
  if (user.role === 'admin') {
    // For simplicity in the test page, we'll just return true
    // In a real implementation, you would check actual permissions
    return true
  }

  return false
}
