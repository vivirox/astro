/**
 * Polyfills for accessibility features in older browsers
 */

/**
 * Adds focus-visible polyfill for browsers that don't support i
 */
export function addFocusVisiblePolyfill(): void {
  if (typeof window === 'undefined') return

  // Check if browser supports :focus-visible
  const supportsFocusVisible =
    'CSS' in window && CSS.supports('selector(:focus-visible)')

  if (!supportsFocusVisible) {
    // Add a class to the html elemen
    document.documentElement.classList.add('no-focus-visible')

    // Add event listeners to track keyboard vs mouse focus
    let hadKeyboardEvent = false
    const keyboardThrottleTimeoutId = { current: null as number | null }

    // These elements should always have a focus ring

    // Function to handle keydown events
    function onKeyDown(e: KeyboardEvent): void {
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
    }

    // Function to handle pointer down events
    function onPointerDown(): void {
      hadKeyboardEvent = false
    }

    // Function to handle focus events
    function onFocus(e: FocusEvent): void {
      if (hadKeyboardEvent) {
        document.documentElement.classList.add('focus-visible')
        activeElement = document.activeElement
      }
    }

    // Function to handle blur events
    function onBlur(): void {
      document.documentElement.classList.remove('focus-visible')
      activeElement = null
    }
  }
}
