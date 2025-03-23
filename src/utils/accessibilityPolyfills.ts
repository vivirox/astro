/**
 * Polyfills for accessibility features in older browsers
 */

/**
 * Adds focus-visible polyfill for browsers that don't support it
 */
export function addFocusVisiblePolyfill(): void {
  if (typeof window === 'undefined') return

  // Check if browser supports :focus-visible
  const supportsFocusVisible =
    'CSS' in window && CSS.supports('selector(:focus-visible)')

  if (!supportsFocusVisible) {
    // Add a class to the html element
    document.documentElement.classList.add('no-focus-visible')

    // Add event listeners to track keyboard vs mouse focus
    let hadKeyboardEvent = false
    const keyboardThrottleTimeoutId = { current: null as number | null }

    // Track the element that had focus before for debugging/logging purposes
    const focusTracker = {
      previousActiveElement: null as Element | null,
      trackFocusChange() {
        this.previousActiveElement = document.activeElement
      },
      reset() {
        this.previousActiveElement = null
      },
    }

    // Event handlers
    const handlers = {
      // Handle keydown events
      handleKeyDown(e: KeyboardEvent): void {
        // Only keyboard events that might trigger focus change
        if (
          e.key === 'Tab' ||
          e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight'
        ) {
          hadKeyboardEvent = true

          // Throttle setting the className to avoid layout thrashing
          if (keyboardThrottleTimeoutId.current !== null) {
            clearTimeout(keyboardThrottleTimeoutId.current)
          }

          keyboardThrottleTimeoutId.current = setTimeout(() => {
            keyboardThrottleTimeoutId.current = null
          }, 100) as unknown as number
        }
      },

      // Handle pointer down events
      handlePointerDown(): void {
        hadKeyboardEvent = false
      },

      // Handle focus events
      handleFocus(): void {
        if (hadKeyboardEvent) {
          document.documentElement.classList.add('focus-visible')
          focusTracker.trackFocusChange()
        }
      },

      // Handle blur events
      handleBlur(): void {
        document.documentElement.classList.remove('focus-visible')
        focusTracker.reset()
      },
    }

    // Register event listeners
    document.addEventListener('keydown', handlers.handleKeyDown, true)
    document.addEventListener('pointerdown', handlers.handlePointerDown, true)
    document.addEventListener('focus', handlers.handleFocus, true)
    document.addEventListener('blur', handlers.handleBlur, true)
  }
}
