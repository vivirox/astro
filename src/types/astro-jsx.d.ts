/**
 * Global TypeScript declarations for Astro JSX elements
 * Prevents "JSX element implicitly has type 'any'" errors
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}

export {}
