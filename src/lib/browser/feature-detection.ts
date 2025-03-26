/**
 * Browser feature detection utilities
 */

export interface Feature {
  name: string
  test: () => boolean
}

/**
 * Feature detection tests
 */
export const FEATURES: Feature[] = [
  {
    name: 'Promise',
    test: () => typeof Promise !== 'undefined',
  },
  {
    name: 'async/await',
    test: () => {
      try {
        // Check if async functions are supported in the environment
        return (
          typeof Object.getOwnPropertyDescriptor(
            Function.prototype,
            'constructor',
          )?.value === 'function' &&
          Object.getOwnPropertyDescriptor(Function.prototype, 'constructor')
            ?.value.toString()
            .includes('async')
        )
      } catch {
        return false
      }
    },
  },
  {
    name: 'WebCrypto',
    test: () =>
      typeof window !== 'undefined' &&
      'crypto' in window &&
      'subtle' in window.crypto,
  },
  {
    name: 'IndexedDB',
    test: () => typeof window !== 'undefined' && 'indexedDB' in window,
  },
  {
    name: 'ServiceWorker',
    test: () => typeof window !== 'undefined' && 'serviceWorker' in navigator,
  },
  {
    name: 'WebAssembly',
    test: () => typeof WebAssembly !== 'undefined',
  },
  {
    name: 'SharedArrayBuffer',
    test: () => typeof SharedArrayBuffer !== 'undefined',
  },
  {
    name: 'BigInt',
    test: () => typeof BigInt !== 'undefined',
  },
  {
    name: 'TextEncoder',
    test: () => typeof TextEncoder !== 'undefined',
  },
  {
    name: 'TextDecoder',
    test: () => typeof TextDecoder !== 'undefined',
  },
]

/**
 * Test if a feature is supported
 */
export function isFeatureSupported(feature: Feature): boolean {
  try {
    return feature.test()
  } catch {
    return false
  }
}

/**
 * Get all supported features
 */
export function getSupportedFeatures(): Record<string, boolean> {
  return FEATURES.reduce(
    (acc, feature) => {
      acc[feature.name] = isFeatureSupported(feature)
      return acc
    },
    {} as Record<string, boolean>,
  )
}
