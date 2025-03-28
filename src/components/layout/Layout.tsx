import React from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'

export interface LayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  showFooter?: boolean
  showThemeToggle?: boolean
  showUserMenu?: boolean
  showSocialLinks?: boolean
  showSidebar?: boolean
  contentClassName?: string
}

export function Layout({
  children,
  showHeader = true,
  showFooter = true,
  showThemeToggle = true,
  showUserMenu = true,
  showSocialLinks = true,
  showSidebar = true,
  contentClassName = '',
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showHeader && (
        <Header showThemeToggle={showThemeToggle} showUserMenu={showUserMenu} />
      )}

      <div className="flex overflow-hidden">
        {showSidebar && <Sidebar />}

        <main className="relative h-full w-full overflow-y-auto bg-gray-50 dark:bg-gray-900 lg:ml-64">
          <div className="px-4 pt-6 pb-4">{children}</div>

          {showFooter && <Footer showSocialLinks={showSocialLinks} />}
        </main>
      </div>
    </div>
  )
}
