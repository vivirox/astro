import type { Browser, BrowserContext, Page } from 'playwright'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, devices, firefox, webkit } from 'playwright'
import { expect } from 'vitest'
import { FEATURES } from '../lib/browser/feature-detection'
import { beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'

let server

beforeAll(async () => {
  // Start Next.js dev server
  server = spawn('pnpm', ['dev'], {
    stdio: 'pipe',
    env: { ...process.env, PORT: '3000' },
  })

  // Wait for server to be ready
  await new Promise((resolve) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('ready')) {
        console.log('Next.js dev server started on port 3000')
        resolve()
      }
    })
  })
})

afterAll(async () => {
  if (server) {
    server.kill()
    console.log('Next.js dev server closed')
  }
})

// Define types for compatibility results
interface PageResult {
  navigationSuccessful?: boolean
  visualIssues?: string[]
  criticalElements?: Record<string, boolean>
  interactions?: Record<string, { success: boolean; details?: string }>
  jsErrors?: string[]
  viewportAdaption?: {
    viewport: { width: number; height: number }
    hasViewportMeta: boolean
    hasHorizontalOverflow: boolean
    tooSmallTapTargets: Element[]
  }
  touchInputResults?: Record<string, { success: boolean; details?: string }>
}

interface BrowserResult {
  pages: Record<string, PageResult>
  features: Record<string, boolean>
}

interface CompatibilityResults {
  timestamp: string
  browsers: Record<string, BrowserResult>
  [key: string]: unknown // For mobile results with dynamic keys
}

// Pages to tes
const TEST_PAGES = [
  { path: '/', name: 'Home Page' },
  { path: '/app/dashboard', name: 'Dashboard' },
  { path: '/app/chat', name: 'Chat' },
  { path: '/app/settings', name: 'Settings' },
]

// Browser configurations to tes
const BROWSERS = [
  { name: 'Chrome', engine: chromium, options: {} },
  { name: 'Firefox', engine: firefox, options: {} },
  { name: 'Safari', engine: webkit, options: {} },
]

// Mobile device configurations to tes
const MOBILE_DEVICES = [
  { name: 'iPhone 12', config: devices['iPhone 12'] },
  { name: 'Pixel 5', config: devices['Pixel 5'] },
  { name: 'iPad Air', config: devices['iPad Air'] },
  { name: 'Galaxy Tab S4', config: devices['Galaxy Tab S4'] },
]

// Results storage
const compatibilityResults: CompatibilityResults = {
  timestamp: new Date().toISOString(),
  browsers: {},
}

// Helper function for type-safe access to mobile device results
function getMobileResults(deviceName: string): BrowserResult {
  const key = `mobile_${deviceName.replace(/\s+/g, '_')}`
  if (!compatibilityResults[key]) {
    compatibilityResults[key] = {
      pages: {},
      features: {},
    }
  }
  return compatibilityResults[key] as BrowserResult
}

describe('browser Compatibility Tests', () => {
  // Test each desktop browser
  BROWSERS.forEach(({ name, engine, options }) => {
    describe(`${name} Browser Tests`, () => {
      let browser: Browser
      let page: Page

      beforeAll(async () => {
        browser = await engine.launch(options)
        compatibilityResults.browsers[name] = {
          pages: {},
          features: {},
        }
      })

      afterAll(async () => {
        await browser.close()
      })

      // Feature detection tests
      it('feature detection', async () => {
        page = await browser.newPage()
        await page.goto('http://localhost:3000')

        // Initialize feature detection
        await page.evaluate(() => {
          const script = document.createElement('script')
          script.type = 'module'
          script.textContent = `
            import { initializeFeatureDetection } from '../lib/browser/setup'
            initializeFeatureDetection()
          `
          document.head.appendChild(script)
        })

        // Wait for features to be initialized
        await page.waitForFunction(() => (window as any).__FEATURES__)

        // Check each feature
        for (const feature of FEATURES) {
          const isSupported = await page.evaluate((featureName: string) => {
            return (window as any).__FEATURES__[featureName]
          }, feature.name)

          // Store result
          compatibilityResults.browsers[name].features[feature.name] =
            isSupported
        }

        await page.close()
      })

      // Visual and functional tests for each page
      TEST_PAGES.forEach(({ path, name: pageName }) => {
        it(`visual test - `, async () => {
          page = await browser.newPage()

          // Create page results object
          if (!compatibilityResults.browsers[name].pages[pageName]) {
            compatibilityResults.browsers[name].pages[pageName] = {}
          }

          // Navigation tes
          let navigationSuccessful = false
          try {
            await page.goto(`http://localhost:3000${path}`, { timeout: 10000 })
            navigationSuccessful = true
          } catch {
            console.error(`Failed to navigate to ${pageName} on ${name}`)
          }

          compatibilityResults.browsers[name].pages[
            pageName
          ].navigationSuccessful = navigationSuccessful

          if (navigationSuccessful) {
            // Visual defects tes
            const visualIssues = await checkVisualIssues(page)
            compatibilityResults.browsers[name].pages[pageName].visualIssues =
              visualIssues

            // Take screenshot for verification
            const screenshotDir = join(process.cwd(), 'browser-compatibility')
            await fs.mkdir(screenshotDir, { recursive: true })
            await page.screenshot({
              path: join(
                screenshotDir,
                `${name}-${pageName.replace(/\s+/g, '-')}.png`,
              ),
              fullPage: true,
            })

            // Verify critical elements are visible
            const criticalElements = await checkCriticalElements(page)
            compatibilityResults.browsers[name].pages[
              pageName
            ].criticalElements = criticalElements

            // Interactive elements tes
            const interactionResults = await testInteractions(page)
            compatibilityResults.browsers[name].pages[pageName].interactions =
              interactionResults

            // JavaScript errors tes
            const jsErrors = await checkJsErrors(page)
            compatibilityResults.browsers[name].pages[pageName].jsErrors =
              jsErrors

            // Assert results
            expect(visualIssues.length).toBe(0)
            expect(Object.values(criticalElements).every(Boolean)).toBe(true)
            expect(
              Object.values(interactionResults).every(
                (result) => result?.success,
              ),
            ).toBe(true)
            expect(jsErrors.length).toBe(0)
          }

          await page.close()
        })
      })
    })
  })

  // Mobile browser tests
  MOBILE_DEVICES.forEach(({ name, config }) => {
    describe(`${name} Mobile Tests`, () => {
      let browser: Browser
      let context: BrowserContext
      let page: Page

      beforeAll(async () => {
        browser = await chromium.launch()
        context = await browser.newContext({
          ...config,
          viewport: config.viewport,
          userAgent: config.userAgent,
        })

        // Initialize mobile results
        const mobileResults = getMobileResults(name)
        mobileResults.features = {}
        mobileResults.pages = {}
      })

      afterAll(async () => {
        await browser.close()
      })

      // Feature detection tests
      it('feature detection', async () => {
        page = await context.newPage()
        await page.goto('http://localhost:3000')

        // Initialize feature detection
        await page.evaluate(() => {
          const script = document.createElement('script')
          script.type = 'module'
          script.textContent = `
            import { initializeFeatureDetection } from '../lib/browser/setup'
            initializeFeatureDetection()
          `
          document.head.appendChild(script)
        })

        // Wait for features to be initialized
        await page.waitForFunction(() => (window as any).__FEATURES__)

        // Check each feature
        for (const feature of FEATURES) {
          const isSupported = await page.evaluate((featureName: string) => {
            return (window as any).__FEATURES__[featureName]
          }, feature.name)

          // Store result
          compatibilityResults.browsers[name].features[feature.name] =
            isSupported
        }

        await page.close()
      })

      // Visual and functional tests for each page
      TEST_PAGES.forEach(({ path, name: pageName }) => {
        it(`responsive design - `, async () => {
          page = await context.newPage()
          const mobileResults = getMobileResults(name)

          // Create page results object if it doesn't exist
          if (!mobileResults.pages[pageName]) {
            mobileResults.pages[pageName] = {}
          }

          // Navigation test
          let navigationSuccessful = false
          try {
            await page.goto(`http://localhost:3000${path}`, { timeout: 10000 })
            navigationSuccessful = true
          } catch {
            console.error(`Failed to navigate to ${pageName} on ${name}`)
          }

          mobileResults.pages[pageName].navigationSuccessful =
            navigationSuccessful

          if (navigationSuccessful) {
            // Mobile-specific tests
            const viewportAdaption = await page.evaluate(() => {
              const viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
              }

              // Check for viewport meta tag
              const viewportMeta = document.querySelector(
                "meta[name='viewport']",
              )
              const hasViewportMeta = Boolean(viewportMeta)

              // Check for horizontal overflow
              const docWidth = document.documentElement.offsetWidth
              const windowWidth = window.innerWidth
              const hasHorizontalOverflow = docWidth > windowWidth

              // Check tap target sizes
              const tooSmallTapTargets = Array.from(
                document.querySelectorAll(
                  "a, button, [role='button'], input, select, textarea",
                ),
              ).filter((el) => {
                const rect = el.getBoundingClientRect()
                return rect.width < 48 || rect.height < 48
              })

              return {
                viewport,
                hasViewportMeta,
                hasHorizontalOverflow,
                tooSmallTapTargets,
              }
            })

            mobileResults.pages[pageName].viewportAdaption = viewportAdaption

            // Take screenshot for verification
            const mobileScreenshotDir = join(
              process.cwd(),
              'browser-compatibility',
            )
            await fs.mkdir(mobileScreenshotDir, { recursive: true })
            await page.screenshot({
              path: join(
                mobileScreenshotDir,
                `mobile-${name.replace(/\s+/g, '-')}-${pageName.replace(/\s+/g, '-')}.png`,
              ),
              fullPage: true,
            })

            // Mobile touch input test
            const touchInputResults = await testTouchInteractions(page)
            mobileResults.pages[pageName].touchInputResults = touchInputResults

            // JavaScript errors test
            const jsErrors = await checkJsErrors(page)
            mobileResults.pages[pageName].jsErrors = jsErrors

            // Assert results
            expect(
              viewportAdaption.hasViewportMeta,
              `No viewport meta tag on ${pageName} with ${name}`,
            ).toBe(true)
            expect(
              viewportAdaption.hasHorizontalOverflow,
              `Horizontal overflow on ${pageName} with ${name}`,
            ).toBe(false)
            expect(viewportAdaption.tooSmallTapTargets.length).toBeLessThan(5)
            expect(
              Object.values(touchInputResults).every(
                (result) => result?.success,
              ),
              `Touch interaction issues on ${pageName} with ${name}`,
            ).toBe(true)
            expect(
              jsErrors.length,
              `JavaScript errors found on ${pageName} with ${name}`,
            ).toBe(0)
          }

          await page.close()
        })
      })
    })
  })

  // Save compatibility results after all tests
  afterAll(async () => {
    const resultsDir = join(process.cwd(), 'browser-compatibility')
    await fs.mkdir(resultsDir, { recursive: true })
    await fs.writeFile(
      join(
        resultsDir,
        `compatibility-${new Date().toISOString().replace(/:/g, '-')}.json`,
      ),
      JSON.stringify(compatibilityResults, null, 2),
    )
  })
})

// Helper functions for browser compatibility testing

async function checkVisualIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = []

    // Check for overlapping elements
    const elements = document.querySelectorAll('*')
    const elementsWithPosition = Array.from(elements).filter((el) => {
      const style = window.getComputedStyle(el)
      return style.position !== 'static'
    })

    elementsWithPosition.forEach((el1) => {
      const rect1 = el1.getBoundingClientRect()
      elementsWithPosition.forEach((el2) => {
        if (el1 !== el2) {
          const rect2 = el2.getBoundingClientRect()
          const overlap = !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
          )

          if (overlap) {
            // Check if one is a child of the other
            if (!el1.contains(el2) && !el2.contains(el1)) {
              issues.push(
                `Overlapping elements: ${el1.tagName} and ${el2.tagName}`,
              )
            }
          }
        }
      })
    })

    // Check for elements extending outside viewport
    Array.from(elements).forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.right > window.innerWidth + 5) {
        // Adding small tolerance
        issues.push(`Element extends beyond right viewport: ${el.tagName}`)
      }
    })

    // Check for text overflow
    const textElements = document.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, span, div',
    )
    Array.from(textElements).forEach((el) => {
      const style = window.getComputedStyle(el)
      if (style.overflow !== 'visible' && el.scrollWidth > el.clientWidth) {
        issues.push(
          `Text overflow in ${el.tagName}: "${el.textContent?.substring(0, 20)}..."`,
        )
      }
    })

    // Check for contrast issues (basic check)
    const textNodes: Node[] = []
    const treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
    )

    let currentNode = treeWalker.nextNode()
    while (currentNode !== null) {
      textNodes.push(currentNode)
      currentNode = treeWalker.nextNode()
    }

    textNodes.forEach((node: Node) => {
      if (node.nodeValue?.trim()) {
        const el = node.parentElement
        if (el) {
          const style = window.getComputedStyle(el)
          const backgroundColor = style.backgroundColor
          const color = style.color

          if (
            backgroundColor === 'rgba(0, 0, 0, 0)' ||
            backgroundColor === 'transparent'
          ) {
            // Skip transparent backgrounds
            return
          }

          // Very basic contrast check - this is not a proper WCAG check
          const isBothLight =
            (color.includes('255, 255, 255') ||
              color.includes('rgb(2') ||
              color.includes('#f')) &&
            (backgroundColor.includes('255, 255, 255') ||
              backgroundColor.includes('rgb(2') ||
              backgroundColor.includes('#f'))

          const isBothDark =
            (color.includes('rgb(0') || color.includes('#0')) &&
            (backgroundColor.includes('rgb(0') ||
              backgroundColor.includes('#0'))

          if (isBothLight || isBothDark) {
            issues.push(
              `Possible contrast issue: ${el.tagName} with text "${node.nodeValue.substring(
                0,
                20,
              )}..."`,
            )
          }
        }
      }
    })

    return issues
  })
}

async function checkCriticalElements(
  page: Page,
): Promise<Record<string, boolean>> {
  return page.evaluate(() => {
    const isMobile = window.innerWidth < 768

    // Common critical elements
    const results: Record<string, boolean> = {
      hasHeader: Boolean(document.querySelector('header')),
      hasFooter: Boolean(document.querySelector('footer')),
      hasMainContent: Boolean(document.querySelector('main')),
    }

    // Add page-specific critical elements
    const path = window.location.pathname

    if (path === '/' || path === '') {
      results.hasHeroSection = Boolean(
        document.querySelector('[class*="hero"]') ||
          document.querySelector('section:first-of-type'),
      )
      results.hasCTAButton = Boolean(
        document.querySelector('a[href*="/app"]') ||
          document.querySelector('button'),
      )
    } else if (path.includes('/app/dashboard')) {
      results.hasNavigation = Boolean(document.querySelector('nav'))
      results.hasUserInfo = Boolean(
        document.querySelector('[class*="user"]') ||
          document.querySelector('[class*="profile"]'),
      )
      results.hasWidgets = Boolean(
        document.querySelectorAll('[class*="widget"]').length > 0 ||
          document.querySelectorAll('section').length > 0,
      )
    } else if (path.includes('/app/chat')) {
      results.hasChatInput = Boolean(
        document.querySelector('textarea') ||
          document.querySelector('input[type="text"]'),
      )
      results.hasChatMessages = Boolean(
        document.querySelector('[class*="message"]') ||
          document.querySelector('[class*="chat"]'),
      )
      results.hasSendButton = Boolean(
        document.querySelector('button[type="submit"]') ||
          document.querySelector('[class*="send"]'),
      )
    } else if (path.includes('/app/settings')) {
      results.hasSettingsForm = Boolean(document.querySelector('form'))
      results.hasSettingsSections = Boolean(
        document.querySelectorAll('section').length > 0 ||
          document.querySelectorAll('fieldset').length > 0,
      )
      results.hasSaveButton = Boolean(
        document.querySelector('button[type="submit"]') ||
          document.querySelector('input[type="submit"]') ||
          document.querySelector('button:not([type])'),
      )
    }

    // Mobile-specific element checks
    if (isMobile) {
      results.hasMobileMenu = Boolean(
        document.querySelector('[class*="hamburger"]') ||
          document.querySelector('[class*="menu-icon"]') ||
          document.querySelector('button[aria-label*="menu"]'),
      )
    }

    return results
  })
}

async function testInteractions(
  page: Page,
): Promise<Record<string, { success: boolean; details?: string }>> {
  const results: Record<string, { success: boolean; details?: string }> = {}

  // Test navigation links
  try {
    const navLinks = await page.$$('nav a, header a')
    if (navLinks.length > 0) {
      const randomIndex = Math.floor(Math.random() * navLinks.length)
      await navLinks[randomIndex].click({ timeout: 5000 })
      results.navigationClick = { success: true }
    } else {
      results.navigationClick = {
        success: true,
        details: 'No navigation links found',
      }
    }
  } catch (err) {
    results.navigationClick = {
      success: false,
      details: err instanceof Error ? err.message : String(err),
    }
  }

  // Test form inputs
  try {
    const inputs = await page.$$(
      'input[type="text"], input[type="email"], textarea',
    )
    if (inputs.length > 0) {
      const randomIndex = Math.floor(Math.random() * inputs.length)
      await inputs[randomIndex].type('Test input', { timeout: 5000 })
      results.formInput = { success: true }
    } else {
      results.formInput = { success: true, details: 'No form inputs found' }
    }
  } catch (err) {
    results.formInput = {
      success: false,
      details: err instanceof Error ? err.message : String(err),
    }
  }

  // Test buttons
  try {
    const buttons = await page.$$(
      'button:not([disabled]), [role="button"]:not([disabled])',
    )
    if (buttons.length > 0) {
      const randomIndex = Math.floor(Math.random() * buttons.length)
      await buttons[randomIndex].click({ timeout: 5000 })
      results.buttonClick = { success: true }
    } else {
      results.buttonClick = { success: true, details: 'No buttons found' }
    }
  } catch (err) {
    results.buttonClick = {
      success: false,
      details: err instanceof Error ? err.message : String(err),
    }
  }

  return results
}

async function testTouchInteractions(
  page: Page,
): Promise<Record<string, { success: boolean; details?: string }>> {
  const results: Record<string, { success: boolean; details?: string }> = {}

  // Test tap on touch targets
  try {
    const touchTargets = await page.$$(
      'a, button, [role="button"], input, select',
    )
    if (touchTargets.length > 0) {
      const randomIndex = Math.floor(Math.random() * touchTargets.length)
      await touchTargets[randomIndex].tap({ timeout: 5000 })
      results.tap = { success: true }
    } else {
      results.tap = { success: true, details: 'No touch targets found' }
    }
  } catch (err) {
    results.tap = {
      success: false,
      details: err instanceof Error ? err.message : String(err),
    }
  }

  // Test scroll
  try {
    await page.evaluate(() => {
      window.scrollBy(0, 100)
    })
    results.scroll = { success: true }
  } catch (err) {
    results.scroll = {
      success: false,
      details: err instanceof Error ? err.message : String(err),
    }
  }

  // Test mobile menu toggle (if present)
  try {
    const mobileMenuButton = await page.$(
      '[class*="hamburger"], [class*="menu-icon"], button[aria-label*="menu"]',
    )
    if (mobileMenuButton) {
      await mobileMenuButton.tap({ timeout: 5000 })
      // Check if the menu appeared
      const menuVisible = await page.evaluate(() => {
        // Look for elements that might be the mobile menu
        const possibleMenus = document.querySelectorAll(
          'nav[class*="open"], [class*="mobile-menu"][class*="open"], [class*="menu"][class*="open"], [aria-expanded="true"]',
        )
        return possibleMenus.length > 0
      })
      results.mobileMenu = {
        success: menuVisible,
        details: menuVisible ? undefined : 'Menu did not appear after click',
      }
    } else {
      results.mobileMenu = {
        success: true,
        details: 'No mobile menu button found',
      }
    }
  } catch (err) {
    results.mobileMenu = {
      success: false,
      details: err instanceof Error ? err.message : String(err),
    }
  }

  return results
}

async function checkJsErrors(page: Page): Promise<string[]> {
  const errors: string[] = []

  page.on('console', (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  page.on('pageerror', (err: Error) => {
    errors.push(err.message)
  })

  // Trigger some interactions to possibly reveal JS errors
  await page.evaluate(() => {
    window.scrollBy(0, 100)
    window.scrollBy(0, -100)

    // Trigger mouseover on interactive elements
    document.querySelectorAll('a, button, input').forEach((el) => {
      const event = new MouseEvent('mouseover', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
      el.dispatchEvent(event)
    })
  })

  return errors
}
