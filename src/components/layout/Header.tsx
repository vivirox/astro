import React, { useState } from 'react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { UserMenu } from '../ui/UserMenu'
import Navigation from './Navigation'

export interface HeaderProps {
  /** Show the theme toggle button */
  showThemeToggle?: boolean
  /** Show the user menu (profile, settings, logout) */
  showUserMenu?: boolean
  /** Additional className for styling */
  className?: string
}

export function Header({
  showThemeToggle = true,
  showUserMenu = true,
  className = '',
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header
      className={`w-full py-4 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${className}`}
    >
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Logo" className="w-8 h-8" />
            <span className="text-xl font-bold">Gradiant</span>
          </a>
        </div>

        <div className="hidden md:block">
          <Navigation />
        </div>

        <div className="flex items-center gap-4">
          {showThemeToggle && <ThemeToggle />}
          {showUserMenu && <UserMenu />}
          <button
            className="md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Navigation isMobile={true} />
        </div>
      )}
    </header>
  )
}

export default Header
