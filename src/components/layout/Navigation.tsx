import type { UserRole } from '../../types/auth'
import React from 'react'
import { useAuth } from '../../hooks/useAuth'

export interface NavigationItem {
  label: string
  href: string
  icon?: React.ReactNode
  requiresAuth?: boolean
  requiresGuest?: boolean
  roles?: UserRole[]
}

export interface NavigationProps {
  /** Navigation items to display */
  items?: NavigationItem[]
  /** Use vertical navigation layout instead of horizontal */
  vertical?: boolean
  /** Additional className for styling */
  className?: string
  /** Mobile navigation */
  isMobile?: boolean
}

// Default navigation items
const defaultItems: NavigationItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard', requiresAuth: true },
  { label: 'Chat', href: '/chat', requiresAuth: true },
  { label: 'Simulator', href: '/simulator', requiresAuth: true },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Login', href: '/login', requiresGuest: true },
  { label: 'Sign Up', href: '/signup', requiresGuest: true },
]

export function Navigation({
  items = defaultItems,
  vertical = false,
  className = '',
  isMobile = false,
}: NavigationProps) {
  const { user, isAuthenticated } = useAuth()

  // Filter navigation items based on authentication state and user roles
  const filteredItems = items.filter((item) => {
    // Skip items that require auth when user is not authenticated
    if (item.requiresAuth && !isAuthenticated) {
      return false
    }

    // Skip items that require guest when user is authenticated
    if (item.requiresGuest && isAuthenticated) {
      return false
    }

    if (!user || !user.roles) {
      return false
    }

    // Check if the user has any of the required roles
    if (item.roles && item.roles.length > 0) {
      if (!user || !user.roles) {
        return false
      }

      const hasRequiredRole = user.roles.some((role) =>
        item.roles?.includes(role),
      )

      if (!hasRequiredRole) {
        return false
      }
    }

    return true
  })

  const navClasses = vertical
    ? `flex flex-col space-y-2 ${className}`
    : `flex ${isMobile ? 'flex-col space-y-4' : 'items-center gap-6'} ${className}`

  const linkClasses = isMobile
    ? 'block py-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary'
    : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors'

  return (
    <nav className={navClasses}>
      {filteredItems.map((item, index) => (
        <a key={`nav-item-${index}`} href={item.href} className={linkClasses}>
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export default Navigation
