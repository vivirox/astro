import React, { useState } from 'react'
import { useAuth } from '../../lib/auth/hooks'
import { AdminPermission } from '../../lib/admin'

// Admin sidebar navigation item type
interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  requiredPermission?: AdminPermission
}

// Props for the AdminLayout component
interface AdminLayoutProps {
  children: React.ReactNode
  title: string
}

/**
 * AdminLayout component
 * Provides a consistent layout for admin pages with navigation and header
 */
export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Define navigation items with required permissions
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/admin',
      icon: <span className="material-symbols-outlined">dashboard</span>,
    },
    {
      label: 'Users',
      path: '/admin/users',
      icon: <span className="material-symbols-outlined">group</span>,
      requiredPermission: AdminPermission.VIEW_USERS,
    },
    {
      label: 'Sessions',
      path: '/admin/sessions',
      icon: <span className="material-symbols-outlined">chat</span>,
      requiredPermission: AdminPermission.MANAGE_SESSIONS,
    },
    {
      label: 'System',
      path: '/admin/system',
      icon: <span className="material-symbols-outlined">settings</span>,
      requiredPermission: AdminPermission.CONFIGURE_SYSTEM,
    },
    {
      label: 'Audit Logs',
      path: '/admin/audit',
      icon: <span className="material-symbols-outlined">fact_check</span>,
      requiredPermission: AdminPermission.VIEW_AUDIT_LOGS,
    },
  ]

  // Check if user has the required permission for a nav item
  const hasPermission = (permission?: AdminPermission) => {
    if (!permission || !user) return true
    return user.permissions?.includes(permission) || false
  }

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <div className="admin-layout flex min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`admin-sidebar bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <h1
            className={`text-xl font-bold text-purple-600 dark:text-purple-400 ${
              isSidebarOpen ? 'block' : 'hidden'
            }`}
          >
            Gradiant Admin
          </h1>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined">
              {isSidebarOpen ? 'chevron_left' : 'chevron_right'}
            </span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navItems.map(
              (item, index) =>
                hasPermission(item.requiredPermission) && (
                  <li key={index}>
                    <a
                      href={item.path}
                      className="flex items-center p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      <span className="mr-3">{item.icon}</span>
                      {isSidebarOpen && <span>{item.label}</span>}
                    </a>
                  </li>
                )
            )}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {title}
          </h1>

          {/* User profile */}
          <div className="flex items-center">
            <div className="mr-4 text-right">
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
              {user?.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
