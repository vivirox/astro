import { useEffect, useState } from 'react'

interface FeatureSupport {
  feature: string
  supported: boolean | string
  notes?: string
}

interface FeatureTest {
  name: string
  test: () => boolean
}

export function BrowserCompatibilityTester() {
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: '',
    platform: '',
    language: '',
    cookiesEnabled: false,
    vendor: '',
    screenSize: '',
    pixelRatio: 0,
    touchPoints: 0,
    hasTouch: false,
  })
  const [results, setResults] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Collect browser information
    setBrowserInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      vendor: navigator.vendor,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      touchPoints: navigator.maxTouchPoints,
      hasTouch: 'ontouchstart' in window,
    })

    // Test feature suppor
    const featureTests: FeatureTest[] = [
      {
        name: 'ES2024 Features',
        test: () => {
          try {
            // Test for specific ES2024 features safely
            return (
              typeof Promise.withResolvers === 'function' &&
              typeof Array.prototype.groupBy === 'function' &&
              typeof Array.prototype.findLast === 'function'
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
        name: 'WebWorkers',
        test: () => typeof window !== 'undefined' && 'Worker' in window,
      },
      {
        name: 'SharedArrayBuffer',
        test: () => typeof SharedArrayBuffer === 'function',
      },
      {
        name: 'WebAssembly',
        test: () => typeof WebAssembly === 'object',
      },
    ]

    const testResults: Record<string, boolean> = {}
    featureTests.forEach(({ name, test }) => {
      try {
        testResults[name] = test()
      } catch {
        testResults[name] = false
      }
    })

    setResults(testResults)
  }, [])

  // Helper functions for feature detection
  function testCSSProperty(property: string): boolean {
    const element = document.createElement('div')
    return property in element.style
  }

  function testLocalStorage(): boolean {
    try {
      localStorage.setItem('test', 'test')
      localStorage.removeItem('test')
      return true
    } catch {
      return false
    }
  }

  function testAsyncAwait(): boolean {
    try {
      // Test async/await support without eval
      const AsyncFunction = (async () => {}).constructor
      new AsyncFunction()
      return true
    } catch {
      return false
    }
  }

  function testReducedMotion(): string {
    if (typeof window.matchMedia !== 'function') return 'Not supported'
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'Active'
      : 'Supported'
  }

  function testHighContrastMode(): string {
    if (typeof window.matchMedia !== 'function') return 'Not supported'
    // Different browsers have different ways to detect high contrast mode
    const isHighContras =
      window.matchMedia('(forced-colors: active)').matches ||
      window.matchMedia('-ms-high-contrast: active').matches
    return isHighContrast ? 'Active' : 'Supported'
  }

  return (
    <div className="browser-compatibility-tester">
      <h2>Browser Compatibility Test</h2>

      <section aria-labelledby="browser-info-heading">
        <h3 id="browser-info-heading">Browser Information</h3>
        <ul>
          <li>
            <strong>User Agent:</strong> {browserInfo.userAgent}
          </li>
          <li>
            <strong>Platform:</strong> {browserInfo.platform}
          </li>
          <li>
            <strong>Language:</strong> {browserInfo.language}
          </li>
          <li>
            <strong>Vendor:</strong> {browserInfo.vendor}
          </li>
          <li>
            <strong>Cookies Enabled:</strong>{' '}
            {browserInfo.cookiesEnabled ? 'Yes' : 'No'}
          </li>
          <li>
            <strong>Screen Size:</strong> {browserInfo.screenSize}
          </li>
          <li>
            <strong>Pixel Ratio:</strong> {browserInfo.pixelRatio}
          </li>
          <li>
            <strong>Touch Points:</strong> {browserInfo.touchPoints}
          </li>
          <li>
            <strong>Touch Support:</strong>{' '}
            {browserInfo.hasTouch ? 'Yes' : 'No'}
          </li>
        </ul>
      </section>

      <section aria-labelledby="feature-support-heading">
        <h3 id="feature-support-heading">Feature Support</h3>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Support</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(results).map(([feature, supported]) => (
              <tr key={feature}>
                <td>{feature}</td>
                <td>
                  {typeof supported === 'boolean'
                    ? supported
                      ? '✅ Yes'
                      : '❌ No'
                    : 'Not Supported'}
                </td>
                <td>
                  {feature === 'ES2024 Features'
                    ? 'Used for modern JavaScript features'
                    : feature === 'WebCrypto'
                      ? 'Used for secure encryption'
                      : feature === 'WebWorkers'
                        ? 'Used for background processing'
                        : feature === 'SharedArrayBuffer'
                          ? 'Used for high-performance data sharing'
                          : feature === 'WebAssembly'
                            ? 'Used for high-performance code execution'
                            : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
