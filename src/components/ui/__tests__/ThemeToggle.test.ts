import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/dom'
import { renderAstro } from '@/test/utils/astro'
import ThemeToggle from '../ThemeToggle.astro'

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = localStorageMock

    // Mock matchMedia
    global.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    // Reset the document theme before each test
    document.documentElement.classList.remove('dark', 'light')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with correct base classes', async () => {
    const { container } = await renderAstro(ThemeToggle)
    const button = container.querySelector('button')

    expect(button).toHaveClass('p-2', 'rounded-md')
    expect(button).toHaveAttribute('aria-label', 'Toggle theme')
  })

  it('shows correct icon based on current theme', async () => {
    const { container } = await renderAstro(ThemeToggle)

    // Initially system theme (should show system icon)
    const systemIcon = container.querySelector('#system-icon')
    const lightIcon = container.querySelector('#sun-icon')
    const darkIcon = container.querySelector('#moon-icon')

    expect(systemIcon).toHaveClass('hidden')
    expect(lightIcon).toHaveClass('hidden')
    expect(darkIcon).toHaveClass('hidden')

    // Simulate dark theme
    document.documentElement.classList.add('dark')
    fireEvent.click(container.querySelector('button')!)

    expect(darkIcon).not.toHaveClass('hidden')
    expect(lightIcon).toHaveClass('hidden')
    expect(systemIcon).toHaveClass('hidden')

    // Simulate light theme
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    fireEvent.click(container.querySelector('button')!)

    expect(lightIcon).not.toHaveClass('hidden')
    expect(darkIcon).toHaveClass('hidden')
    expect(systemIcon).toHaveClass('hidden')
  })

  it('cycles through themes on button click', async () => {
    const { container } = await renderAstro(ThemeToggle)
    const button = container.querySelector('button')!

    // Initial state (system)
    expect(localStorage.getItem('theme')).toBeNull()

    // First click (dark)
    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')

    // Second click (light)
    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('light')

    // Third click (back to system)
    fireEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('applies custom class from props', async () => {
    const customClass = 'custom-theme-toggle'
    const { container } = await renderAstro(ThemeToggle, { class: customClass })
    const button = container.querySelector('button')

    expect(button).toHaveClass(customClass)
  })

  it('preserves theme preference across page loads', async () => {
    // Set initial theme preference
    localStorage.setItem('theme', 'dark')

    const { container } = await renderAstro(ThemeToggle)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(container.querySelector('#moon-icon')).not.toHaveClass('hidden')
  })

  it('respects system preference when no theme is set', async () => {
    // Mock system dark preference
    global.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { container } = await renderAstro(ThemeToggle)

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(container.querySelector('#system-icon')).not.toHaveClass('hidden')
  })
})
