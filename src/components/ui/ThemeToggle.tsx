import { Moon, MousePointerClick, Sun, ZapIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [activeTheme, setTheme] = useState<'light' | 'dark' | 'system'>(
    'system',
  )
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Initialize theme from local storage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as
      | 'light'
      | 'dark'
      | 'system'
      | null
    const savedHighContrast = localStorage.getItem('highContrast') === 'true'
    const savedReducedMotion = localStorage.getItem('reducedMotion') === 'true'

    setHighContrast(savedHighContrast)
    setReducedMotion(savedReducedMotion)

    if (savedTheme) {
      setTheme(savedTheme)
      applyTheme(savedTheme)
    } else {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'
      setTheme('system')
      applyTheme(systemTheme)
    }
  }, [])

  // Apply theme changes
  const applyTheme = (newTheme: string) => {
    const root = document.documentElemen
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    const effectiveTheme = newTheme === 'system' ? systemTheme : newTheme

    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Save theme preference
    localStorage.setItem('theme', newTheme)
  }

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    applyTheme(newTheme)
    setIsOpen(false)
  }

  // Handle high contrast toggle
  const handleHighContrastChange = (value: boolean) => {
    setHighContrast(value)
    const root = document.documentElemen

    if (value) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }

    localStorage.setItem('highContrast', value.toString())
  }

  // Handle reduced motion toggle
  const handleReducedMotionChange = (value: boolean) => {
    setReducedMotion(value)
    const root = document.documentElemen

    if (value) {
      root.classList.add('reduced-motion')
    } else {
      root.classList.remove('reduced-motion')
    }

    localStorage.setItem('reducedMotion', value.toString())
  }

  return (
    <div className={`relative ${className}`}>
      <button
        className={`
          h-9 w-9 rounded-md p-2 flex items-center justify-center
          ${!reducedMotion ? 'transition-transform duration-200' : ''}
          hover:bg-gray-100 dark:hover:bg-gray-800
        `}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
        >
          <div className="py-1" role="none">
            <button
              className={`flex items-center w-full px-4 py-2 text-sm
                ${activeTheme === 'light' ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              onClick={() => handleThemeChange('light')}
              role="menuitem"
            >
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </button>
            <button
              className={`flex items-center w-full px-4 py-2 text-sm
                ${activeTheme === 'dark' ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              onClick={() => handleThemeChange('dark')}
              role="menuitem"
            >
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </button>
            <button
              className={`flex items-center w-full px-4 py-2 text-sm
                ${activeTheme === 'system' ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              onClick={() => handleThemeChange('system')}
              role="menuitem"
            >
              <span className="mr-2">💻</span>
              <span>System</span>
            </button>
            <hr className="my-1 border-gray-200 dark:border-gray-600" />
            <div className="px-4 py-2 text-sm">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => handleHighContrastChange(e.target.checked)}
                  className="mr-2"
                />
                <ZapIcon className="mr-2 h-4 w-4" />
                <span>High Contrast</span>
              </label>
            </div>
            <div className="px-4 py-2 text-sm">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => handleReducedMotionChange(e.target.checked)}
                  className="mr-2"
                />
                <MousePointerClick className="mr-2 h-4 w-4" />
                <span>Reduced Motion</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
