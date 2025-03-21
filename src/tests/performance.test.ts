import { test, expect } from 'vitest'
import { chromium } from 'playwright'
import type { Browser, Page } from 'playwright'
import fs from 'fs/promises'
import { join } from 'path'

const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals thresholds
  LCP: 2500, // Largest Contentful Paint (ms) - 2.5s is "good"
  FID: 100, // First Input Delay (ms) - 100ms is "good"
  CLS: 0.1, // Cumulative Layout Shift - 0.1 is "good"

  // Additional metrics
  FCP: 1800, // First Contentful Paint (ms)
  TTI: 3800, // Time to Interactive (ms)
  TBT: 200, // Total Blocking Time (ms)

  // Resource metrics
  resourceCount: 100, // Maximum number of resources
  resourceSize: 3 * 1024 * 1024, // Maximum total resource size (_3MB)

  // JavaScript execution
  jsExecutionTime: 1000, // Maximum JS execution time (ms)

  // Response time
  apiResponseTime: 500, // Maximum API response time (ms)
}

// Pages to tes
const TEST_PAGES = [
  { path: '/', name: 'Home Page' },
  { path: '/app/dashboard', name: 'Dashboard' },
  { path: '/app/chat', name: 'Chat' },
  { path: '/app/settings', name: 'Settings' },
]

// API endpoints to tes
const API_ENDPOINTS = [
  {
    path: '/api/ai/completion',
    method: 'POST',
    payload: {
      model: 'Together-ai-default',
      messages: [{ role: 'user', content: 'Hello' }],
    },
  },
  { path: '/api/ai/usage', method: 'GET' },
]

describe('Performance Tests', () => {
  let browser: Browser
  let page: Page
  let results: any = {}

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true })
    results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      pages: {},
      api: {},
    }
  })

  afterAll(async () => {
    await browser.close()

    // Save results to file for historical comparison
    const resultsDir = join(process.cwd(), 'performance-results')
    await fs.mkdir(resultsDir, { recursive: true })
    await fs.writeFile(
      join(
        resultsDir,
        `performance-${new Date().toISOString().replace(/:/g, '-')}.json`
      ),
      JSON.stringify(results, null, 2)
    )
  })

  // Test Core Web Vitals and other metrics for each page
  TEST_PAGES.forEach(({ path, name }) => {
    test(`Core Web Vitals - ${name}`, async () => {
      page = await browser.newPage()

      // Enable JS profiling
      await page.coverage.startJSCoverage()

      // Navigate to the page
      const startTime = performance.now()
      await page.goto(`http://localhost:3000${path}`, {
        waitUntil: 'networkidle',
      })
      const navigationTime = performance.now() - startTime

      // Collect performance metrics
      const metrics = await page.evaluate(() => {
        const perfEntries = performance.getEntriesByType('navigation')[0] as any
        const paintEntries = performance.getEntriesByType('paint')
        const lcpEntry = (performance as any).getEntriesByType(
          'largest-contentful-paint'
        )[0] || { startTime: 0 }
        const layoutShiftEntries =
          (performance as any).getEntriesByType('layout-shift') || []

        const resources = performance.getEntriesByType('resource')
        const resourceCount = resources.length
        const resourceSize = resources.reduce(
          (total, resource) => total + (resource as any).encodedBodySize,
          0
        )

        // Calculate CLS
        const cumulativeLayoutShift = layoutShiftEntries.reduce(
          (total: number, entry: any) => total + entry.value,
          0
        )

        // Get FCP
        const firstContentfulPaint =
          paintEntries.find(
            (entry: any) => entry.name === 'first-contentful-paint'
          )?.startTime || 0

        return {
          // Core Web Vitals
          LCP: lcpEntry.startTime,
          CLS: cumulativeLayoutShift,
          // We'll measure FID through interaction in a separate tes

          // Additional metrics
          FCP: firstContentfulPaint,
          domContentLoaded:
            perfEntries.domContentLoadedEventEnd -
            perfEntries.domContentLoadedEventStart,
          domComplete: perfEntries.domComplete,
          loadEvent: perfEntries.loadEventEnd - perfEntries.loadEventStart,

          // Resource metrics
          resourceCount,
          resourceSize,
        }
      })

      // Stop JS coverage
      const jsCoverage = await page.coverage.stopJSCoverage()
      const jsSize = jsCoverage.reduce(
        (total, entry) => total + (entry.source?.length || 0),
        0
      )
      const jsExecutionTime = jsCoverage.reduce((total, entry) => {
        const functions = entry.functions || []
        return (
          total +
          functions.reduce((sum, fn) => sum + (fn.ranges[0]?.count || 0), 0)
        )
      }, 0)

      // Store all results
      results.pages[name] = {
        url: path,
        navigationTime,
        ...metrics,
        jsSize,
        jsExecutionTime,
      }

      // Assert on key metrics
      expect(metrics.LCP).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP)
      expect(metrics.CLS).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS)
      expect(metrics.FCP).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP)
      expect(metrics.resourceCount).toBeLessThan(
        PERFORMANCE_THRESHOLDS.resourceCount
      )
      expect(metrics.resourceSize).toBeLessThan(
        PERFORMANCE_THRESHOLDS.resourceSize
      )
      expect(jsExecutionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.jsExecutionTime
      )

      await page.close()
    })

    // Test First Input Delay through simulated user interaction
    test(`First Input Delay - ${name}`, async () => {
      page = await browser.newPage()
      await page.goto(`http://localhost:3000${path}`, { waitUntil: 'load' })

      // Wait for the page to be fully interactive
      await page.waitForTimeout(500)

      // Find a clickable elemen
      const button = await page.$('button, a, input, [role="button"]')

      if (button) {
        // Measure time to process click
        const inputDelayPromise = page.evaluate(() => {
          return new Promise<number>((resolve) => {
            let startTime: number

            const handlePointerDown = () => {
              startTime = performance.now()
              document.removeEventListener('pointerdown', handlePointerDown)
            }

            const handlePointerUp = () => {
              const endTime = performance.now()
              document.removeEventListener('pointerup', handlePointerUp)
              resolve(endTime - startTime)
            }

            document.addEventListener('pointerdown', handlePointerDown)
            document.addEventListener('pointerup', handlePointerUp)
          })
        })

        await button.click()
        const inputDelay = await inputDelayPromise

        // Store resul
        results.pages[name].FID = inputDelay

        // Asser
        expect(inputDelay).toBeLessThan(PERFORMANCE_THRESHOLDS.FID)
      } else {
        // Skip if no clickable element found
        console.warn(`No clickable element found on ${name}`)
      }

      await page.close()
    })
  })

  // Test API endpoint performance
  API_ENDPOINTS.forEach(({ path, method, payload }) => {
    test(`API Performance - ${path}`, async () => {
      page = await browser.newPage()

      // Set up request interception for timing
      let apiResponseTime = 0
      await page.route(`**${path}`, async (route, request) => {
        const startTime = performance.now()
        await route.continue()
        apiResponseTime = performance.now() - startTime
      })

      // Execute reques
      let response
      if (method === 'GET') {
        response = await page.evaluate(async (url: string) => {
          const response = await fetch(url)
          return {
            status: response.status,
            ok: response.ok,
          }
        }, `http://localhost:3000${path}`)
      } else if (method === 'POST') {
        response = await page.evaluate(
          ({ url, data }) => {
            return fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            }).then((response) => ({
              status: response.status,
              ok: response.ok,
            }))
          },
          {
            url: `http://localhost:3000${path}`,
            data: payload,
          }
        )
      }

      // Store resul
      results.api[path] = {
        method,
        responseTime: apiResponseTime,
        status: response?.status,
      }

      // Asser
      expect(apiResponseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.apiResponseTime
      )
      expect(response?.ok).toBe(true)

      await page.close()
    })
  })

  // Historical comparison tes
  test('Performance regression test', async () => {
    const resultsDir = join(process.cwd(), 'performance-results')

    try {
      // Get previous results if they exis
      const files = await fs.readdir(resultsDir)
      const jsonFiles = files.filter((file) => file.endsWith('.json'))

      if (jsonFiles.length > 0) {
        // Sort by date (newest first, excluding current test)
        jsonFiles.sort().reverse()

        // Load the most recent previous resul
        const previousResults = JSON.parse(
          await fs.readFile(join(resultsDir, jsonFiles[0]), 'utf-8')
        )

        // Compare with current results
        for (const [pageName, pageMetrics] of Object.entries(results.pages)) {
          const previousPageMetrics = previousResults.pages[pageName]

          if (previousPageMetrics) {
            // Check for significant regressions (>20% worse)
            for (const metricName of ['LCP', 'FID', 'CLS', 'FCP']) {
              const current = (pageMetrics as any)[metricName]
              const previous = previousPageMetrics[metricName]

              if (current && previous) {
                const percentChange = ((current - previous) / previous) * 100

                // Log warnings for significant regressions
                if (percentChange > 20) {
                  console.warn(
                    `Regression detected in ${pageName} - ${metricName}: ${previous} -> ${current} (${percentChange.toFixed(2)}% worse)`
                  )
                }

                // For critical metrics, fail the test on severe regressions (>50% worse)
                if (
                  ['LCP', 'FID', 'CLS'].includes(metricName) &&
                  percentChange > 50
                ) {
                  expect(percentChange).toBeLessThan(50)
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // First run or other error, skip comparison
      console.log('No previous performance results to compare with.')
    }
  })
})

// Helper functions for simulating real user scenarios
async function simulateUserInteraction(page: Page) {
  // Simulate scrolling
  await page.evaluate(() => {
    window.scrollBy(0, 500)
  })
  await page.waitForTimeout(200)

  // Find and click an interactive elemen
  const button = await page.$('button:not([disabled]), a:not([disabled])')
  if (button) {
    await button.click()
    await page.waitForTimeout(300)
  }

  // Type in an input if available
  const input = await page.$('input:not([disabled])')
  if (input) {
    await input.type('Test input')
    await page.waitForTimeout(200)
  }
}
