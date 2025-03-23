import React, { useEffect, useState } from 'react'

interface AccessibilityAnnouncerProps {
  message: string
  assertive?: boolean
  clearDelay?: number
}

/**
 * A component that announces messages to screen readers
 *
 * @param message - The message to announce
 * @param assertive - Whether to use assertive (true) or polite (false) announcements
 * @param clearDelay - How long to wait before clearing the message (ms)
 */
export default function AccessibilityAnnouncer({
  message,
  assertive = false,
  clearDelay = 1000,
}: AccessibilityAnnouncerProps) {
  const [currentMessage, setCurrentMessage] = useState(message)

  useEffect(() => {
    setCurrentMessage(message)

    // Clear the message after the specified delay
    if (message) {
      const timer = setTimeout(() => {
        setCurrentMessage('')
      }, clearDelay)

      return () => clearTimeout(timer)
    }
  }, [message, clearDelay])

  if (!currentMessage) {
    return null
  }

  return (
    <div
      className="sr-only"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {currentMessage}
    </div>
  )
}

/**
 * Utility function to announce a message to screen readers
 * without needing to render a component
 */
export function announceToScreenReader(
  message: string,
  options: { assertive?: boolean; clearDelay?: number } = {}
): void {
  const { assertive = false, clearDelay = 1000 } = options

  // Create a temporary element for the announcement
  const announcer = document.createElement('div')
  announcer.className = 'sr-only'
  announcer.setAttribute('aria-live', assertive ? 'assertive' : 'polite')
  announcer.setAttribute('aria-atomic', 'true')

  // Add to DOM
  document.body.appendChild(announcer)

  // Set the message (slight delay to ensure screen readers pick it up)
  setTimeout(() => {
    announcer.textContent = message
  }, 50)

  // Remove after the specified delay
  setTimeout(() => {
    if (document.body.contains(announcer)) {
      document.body.removeChild(announcer)
    }
  }, clearDelay + 100)
}
