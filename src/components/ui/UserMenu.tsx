import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

export interface UserMenuProps {
  /** Additional className for styling */
  className?: string
}

export function UserMenu({ className = '' }: UserMenuProps) {
  const { user, isAuthenticated, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // If not authenticated, show login button
  if (!isAuthenticated) {
    return (
      <div className={className}>
        <a
          href="/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Sign in
        </a>
      </div>
    )
  }

  // Get first letter of name or email for avatar
  const avatarText = user?.name
    ? (user.name as string).charAt(0).toUpperCase()
    : (user?.email as string)?.charAt(0).toUpperCase() || '?'

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        className="flex items-center space-x-2 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
          {user?.image ? (
            <img
              src={user.image as string}
              alt={(user.name as string) || 'User avatar'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <span className="text-sm font-medium">{avatarText}</span>
          )}
        </div>
        <span className="hidden md:block text-sm font-medium">
          {(user?.name as string) || (user?.email as string) || 'User'}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-1 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm">{(user?.name as string) || 'User'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {(user?.email as string) || 'User'}
            </p>
          </div>
          <a
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Your Profile
          </a>
          <a
            href="/settings"
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Settings
          </a>
          <button
            onClick={() => signOut()}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
