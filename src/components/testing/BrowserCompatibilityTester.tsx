import { useState, useEffect } from 'react'

interface FeatureSupport {
  feature: string
  supported: boolean | string
  notes?: string
}

export function BrowserCompatibilityTester() {
  const [features, setFeatures] = useState<FeatureSupport[]>([])
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
    const featureTests: FeatureSupport[] = [
      {
        feature: 'CSS Grid',
        supported: testCSSProperty('grid-template-columns'),
        notes: 'Used for layout in chat interface',
      },
      {
        feature: 'CSS Flexbox',
        supported: testCSSProperty('flex-direction'),
        notes: 'Used for component layouts',
      },
      {
        feature: 'CSS Variables',
        supported: testCSSProperty('--test'),
        notes: 'Used for theming',
      },
      {
        feature: 'Fetch API',
        supported: typeof fetch !== 'undefined',
        notes: 'Used for API requests',
      },
      {
        feature: 'IntersectionObserver',
        supported: typeof IntersectionObserver !== 'undefined',
        notes: 'Used for lazy loading',
      },
      {
        feature: 'Web Animations API',
        supported: typeof document.createElement('div').animate !== 'undefined',
        notes: 'Used for UI animations',
      },
      {
        feature: 'ResizeObserver',
        supported: typeof ResizeObserver !== 'undefined',
        notes: 'Used for responsive components',
      },
      {
        feature: 'LocalStorage',
        supported: testLocalStorage(),
        notes: 'Used for storing preferences',
      },
      {
        feature: 'WebSockets',
        supported: typeof WebSocket !== 'undefined',
        notes: 'Used for real-time updates',
      },
      {
        feature: 'ARIA Support',
        supported: 'role' in document.createElement('div'),
        notes: 'Critical for accessibility',
      },
      {
        feature: 'Async/Await',
        supported: testAsyncAwait(),
        notes: 'Used throughout codebase',
      },
      {
        feature: 'CSS Transitions',
        supported: testCSSProperty('transition'),
        notes: 'Used for UI animations',
      },
      {
        feature: 'CSS Animations',
        supported: testCSSProperty('animation'),
        notes: 'Used for loading indicators',
      },
      {
        feature: 'Reduced Motion Support',
        supported: testReducedMotion(),
        notes: 'Used for accessibility',
      },
      {
        feature: 'High Contrast Mode',
        supported: testHighContrastMode(),
        notes: 'Used for accessibility',
      },
    ]

    setFeatures(featureTests)
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
    } catch (e) {
      return false
    }
  }

  function testAsyncAwait(): boolean {
    try {
      eval('(async () => {})()')
      return true
    } catch (e) {
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
    const isHighContrast =
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
            {features.map((feature, index) => (
              <tr key={index}>
                <td>{feature.feature}</td>
                <td>
                  {typeof feature.supported === 'boolean'
                    ? feature.supported
                      ? '✅ Yes'
                      : '❌ No'
                    : feature.supported}
                </td>
                <td>{feature.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
