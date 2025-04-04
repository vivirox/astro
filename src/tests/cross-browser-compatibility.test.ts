/**
 * Cross-Browser Compatibility Tests
 *
 * This file contains tests to verify that our application works correctly
 * across different browsers (Chromium, Firefox, and WebKit).
 */

import { test, expect } from '@playwright/test'

// Define test URLs to check across browsers
const TEST_URLS = {
  home: '/',
  blog: '/blog',
  documentation: '/docs',
  dashboard: '/admin/dashboard',
  simulator: '/simulator',
}

// Define a reusable function to test core page functionality
async function testCoreFunctionality(page, url) {
  await page.goto(url)

  // Verify page loaded
  expect(await page.title()).not.toBe('')

  // Check that critical elements are visible
  await expect(page.locator('header')).toBeVisible()
  await expect(page.locator('footer')).toBeVisible()

  // Check that no console errors occurred
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  // Return any errors found
  return errors
}

// Define tests for different browsers
// Note: These tests will run on the browsers configured in playwright.config.ts
test.describe('Cross-browser compatibility', () => {
  for (const [pageName, url] of Object.entries(TEST_URLS)) {
    test(`${pageName} page should work in all browsers`, async ({
      page,
      browserName,
    }) => {
      // Run the core functionality test
      const errors = await testCoreFunctionality(page, url)

      // Take a screenshot for visual comparison
      await page.screenshot({
        path: `./test-results/cross-browser/${browserName}-${pageName}.png`,
      })

      // Verify no console errors occurred
      expect(errors).toEqual([])

      // Test page-specific elements
      switch (pageName) {
        case 'home':
          // Check hero section
          await expect(page.locator('.hero-section')).toBeVisible()
          break

        case 'blog':
          // Check blog post listing
          await expect(page.locator('article')).toBeVisible()
          break

        case 'documentation':
          // Check docs navigation
          await expect(page.locator('.docs-sidebar')).toBeVisible()
          // Ensure code blocks render correctly
          await expect(page.locator('pre code')).toBeVisible()
          break

        case 'dashboard':
          // Check dashboard elements
          await expect(page.locator('.dashboard-header')).toBeVisible()
          // Ensure charts render properly
          await expect(page.locator('.chart-container')).toBeVisible()
          break

        case 'simulator':
          // Check simulator elements
          await expect(
            page.locator('h2:has-text("Therapeutic Practice Simulator")'),
          ).toBeVisible()
          break
      }
    })
  }

  // Test responsive behavior across browsers
  test('responsive navigation works correctly in all browsers', async ({
    page,
    browserName,
  }) => {
    // Go to home page
    await page.goto('/')

    // Test desktop navigation
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.locator('nav ul')).toBeVisible()

    // Take a screenshot
    await page.screenshot({
      path: `./test-results/cross-browser/${browserName}-nav-desktop.png`,
    })

    // Test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 })

    // Menu should be collapsed on mobile
    await expect(page.locator('nav ul')).not.toBeVisible()
    await expect(page.locator('button[aria-label="Toggle menu"]')).toBeVisible()

    // Open mobile menu
    await page.locator('button[aria-label="Toggle menu"]').click()

    // Menu should now be visible
    await expect(page.locator('nav ul')).toBeVisible()

    // Take a screenshot
    await page.screenshot({
      path: `./test-results/cross-browser/${browserName}-nav-mobile.png`,
    })
  })

  // Test form interactions across browsers
  test('forms work correctly across browsers', async ({
    page,
    browserName,
  }) => {
    // Go to contact page with a form
    await page.goto('/contact')

    // Fill out form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('textarea[name="message"]', 'This is a test message')

    // Take a screenshot of the filled form
    await page.screenshot({
      path: `./test-results/cross-browser/${browserName}-form.png`,
    })

    // Submit form (but intercept the actual submission)
    await page.route('**/api/contact', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    })

    await page.click('button[type="submit"]')

    // Check for success message
    await expect(page.locator('text=Thank you for your message')).toBeVisible()
  })

  // Test animations and transitions
  test('animations and transitions work correctly across browsers', async ({
    page,
    browserName,
  }) => {
    // Go to a page with animations
    await page.goto('/')

    // Scroll to trigger animations
    await page.evaluate(() => window.scrollBy(0, 300))

    // Wait for animations to complete (this is approximate)
    await page.waitForTimeout(1000)

    // Take a screenshot after animations
    await page.screenshot({
      path: `./test-results/cross-browser/${browserName}-animations.png`,
    })
  })
})
