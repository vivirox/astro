import React from 'react'
import { Footer } from './Footer'
import { Header } from './Header'

export interface LayoutProps {
  children: React.ReactNode
  /** Show the header in the layout */
  showHeader?: boolean
  /** Show the footer in the layout */
  showFooter?: boolean
  /** Show the theme toggle in the header */
  showThemeToggle?: boolean
  /** Show the user menu in the header */
  showUserMenu?: boolean
  /** Show social links in the footer */
  showSocialLinks?: boolean
  /** Additional className for the main content area */
  contentClassName?: string
}

export function Layout({
  children,
  showHeader = true,
  showFooter = true,
  showThemeToggle = true,
  showUserMenu = true,
  showSocialLinks = true,
  contentClassName = '',
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      {showHeader && (
        <Header showThemeToggle={showThemeToggle} showUserMenu={showUserMenu} />
      )}

      <main className={`flex-grow ${contentClassName}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>

      {showFooter && <Footer showSocialLinks={showSocialLinks} />}
    </div>
  )
}
