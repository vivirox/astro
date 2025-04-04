import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import {
  AccessibilityAnnouncer,
  announceToScreenReader,
  announce,
} from '../AccessibilityAnnouncer'

// Extend Jest matchers with accessibility assertions
expect.extend(toHaveNoViolations)

describe('AccessibilityAnnouncer Component', () => {
  beforeEach(() => {
    // Create elements that would normally be available in our app
    const politeAnnouncer = document.createElement('div')
    politeAnnouncer.id = 'polite-announce'
    document.body.appendChild(politeAnnouncer)

    const assertiveAnnouncer = document.createElement('div')
    assertiveAnnouncer.id = 'assertive-announce'
    document.body.appendChild(assertiveAnnouncer)
  })

  afterEach(() => {
    cleanup()
    // Clean up the elements we created
    const politeAnnouncer = document.getElementById('polite-announce')
    const assertiveAnnouncer = document.getElementById('assertive-announce')
    if (politeAnnouncer) {
      document.body.removeChild(politeAnnouncer)
    }
    if (assertiveAnnouncer) {
      document.body.removeChild(assertiveAnnouncer)
    }
  })

  it('should render a polite live region by default', () => {
    render(<AccessibilityAnnouncer message="Test message" />)

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    expect(liveRegion).toHaveTextContent('Test message')
  })

  it('should render an assertive live region when specified', () => {
    render(
      <AccessibilityAnnouncer message="Important message" assertive={true} />,
    )

    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
    expect(liveRegion).toHaveTextContent('Important message')
  })

  it('should clear the message after the specified delay', async () => {
    vi.useFakeTimers()

    render(
      <AccessibilityAnnouncer message="Temporary message" clearDelay={500} />,
    )

    // Initially, the message should be present
    expect(screen.getByRole('status')).toHaveTextContent('Temporary message')

    // Fast-forward time
    vi.advanceTimersByTime(600)

    // After the delay, the message should be cleared
    expect(screen.getByRole('status')).toHaveTextContent('')

    vi.useRealTimers()
  })

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <AccessibilityAnnouncer message="Test message" />,
    )

    // Run axe accessibility tests
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('announceToScreenReader should create and remove a live region', () => {
    // Mock appendChild and removeChild
    const appendChildSpy = vi.spyOn(document.body, 'appendChild')
    const removeChildSpy = vi.spyOn(document.body, 'removeChild')

    vi.useFakeTimers()

    announceToScreenReader('Screen reader announcement')

    // Element should be created and appended
    expect(appendChildSpy).toHaveBeenCalled()

    // Fast-forward past the setTimeout that sets text content (50ms)
    vi.advanceTimersByTime(100)

    // Get the last call's first argument (the created element)
    const announcerElement = appendChildSpy.mock.calls[0][0] as HTMLElement
    expect(announcerElement.textContent).toBe('Screen reader announcement')

    // Fast-forward past the cleanup timeout
    vi.advanceTimersByTime(1100)

    // Element should be removed
    expect(removeChildSpy).toHaveBeenCalled()

    vi.useRealTimers()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('announce function should update the appropriate element', () => {
    // Test polite announcement
    announce({ message: 'Polite message' })
    const politeAnnouncer = document.getElementById('polite-announce')
    expect(politeAnnouncer?.textContent).toBe('Polite message')

    // Test assertive announcement
    announce({ message: 'Assertive message', assertive: true })
    const assertiveAnnouncer = document.getElementById('assertive-announce')
    expect(assertiveAnnouncer?.textContent).toBe('Assertive message')
  })
})
