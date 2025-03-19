/**
 * Polyfills for accessibility features in older browsers
 */

/**
 * Adds focus-visible polyfill for browsers that don't support it
 */
export function addFocusVisiblePolyfill(): void {
  if (typeof window === "undefined") return;

  // Check if browser supports :focus-visible
  const supportsFocusVisible =
    "CSS" in window && CSS.supports("selector(:focus-visible)");

  if (!supportsFocusVisible) {
    // Add a class to the html element
    document.documentElement.classList.add("no-focus-visible");

    // Add event listeners to track keyboard vs mouse focus
    let hadKeyboardEvent = false;
    const keyboardThrottleTimeoutId = { current: null as number | null };

    // These elements should always have a focus ring
    const alwaysShowFocusRing = new Set(["input", "textarea", "select"]);

    function onKeyDown(e: KeyboardEvent): void {
      // Only keyboard events that might trigger focus change
      if (
        e.key === "Tab" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        hadKeyboardEvent = true;

        if (keyboardThrottleTimeoutId.current !== null) {
          window.clearTimeout(keyboardThrottleTimeoutId.current);
        }

        keyboardThrottleTimeoutId.current = window.setTimeout(() => {
          hadKeyboardEvent = false;
        }, 100);
      }
    }

    function onPointerDown(): void {
      hadKeyboardEvent = false;
    }

    function onFocus(e: FocusEvent): void {
      if (hadKeyboardEvent) {
        document.documentElement.classList.add("focus-visible");
      } else {
        document.documentElement.classList.remove("focus-visible");
      }
    }

    function onBlur(): void {
      document.documentElement.classList.remove("focus-visible");
    }
  }
}
