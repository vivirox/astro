import { test, expect } from '@playwright/test'

// Check if server is running before running tests
async function isServerRunning(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl, { method: 'HEAD', timeout: 5000 });
    return response.status < 500; // Consider any non-5xx response as "running"
  } catch (e) {
    return false;
  }
}

// Health check test suite
test.describe('Health Check Monitoring', () => {
  // Test the main page loads successfully
  test('Homepage loads correctly', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321'

    // Skip test if server is not running
    const serverRunning = await isServerRunning(baseUrl);
    test.skip(!serverRunning, 'Server is not running');

    await page.goto(baseUrl)

    // Check that the page title is present
    const title = await page.title()
    expect(title).not.toBe('')

    // Check that main content is visible
    await expect(page.locator('main')).toBeVisible()

    // Verify no console errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Wait a moment to catch any async errors
    await page.waitForTimeout(1000)

    // Check for no console errors
    expect(errors.length, `Console errors detected: ${errors.join(', ')}`).toBe(
      0
    )
  })

  // Test API health endpoint
  test('API health endpoint returns 200', async ({ request }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321'

    // Skip test if server is not running
    const serverRunning = await isServerRunning(baseUrl);
    test.skip(!serverRunning, 'Server is not running');

    try {
      const response = await request.get(`${baseUrl}/api/health`, {
        timeout: 10000
      })

      expect(response.status()).toBe(200)

      // Parse the response body
      const body = await response.json()
      expect(body.status).toBe('ok')
      expect(body.checks.api).toBe('ok')
      expect(body.checks.database).toBe('ok')
    } catch (error) {
      console.error('Failed to reach health endpoint:', error);
      test.fail(true, 'Health endpoint request failed');
    }
  })

  // Test authentication page loads
  test('Login page loads correctly', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321'

    // Skip test if server is not running
    const serverRunning = await isServerRunning(baseUrl);
    test.skip(!serverRunning, 'Server is not running');

    await page.goto(`${baseUrl}/login`)

    // Check for login form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  // Test critical path navigation
  test('Critical navigation paths work', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321'

    // Skip test if server is not running
    const serverRunning = await isServerRunning(baseUrl);
    test.skip(!serverRunning, 'Server is not running');

    await page.goto(baseUrl)

    // Test navigation to key pages
    // This will vary based on your application, these are examples
    await page.getByRole('link', { name: /about/i }).click()
    await expect(page).toHaveURL(/.*about/)

    await page.getByRole('link', { name: /contact/i }).click()
    await expect(page).toHaveURL(/.*contact/)

    await page.getByRole('link', { name: /login/i }).click()
    await expect(page).toHaveURL(/.*login/)
  })

  // Test that essential resources load
  test('Essential resources load correctly', async ({ page }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321'

    // Skip test if server is not running
    const serverRunning = await isServerRunning(baseUrl);
    test.skip(!serverRunning, 'Server is not running');

    // Create a set to store failed resources
    const failedResources = new Set<string>()

    // Listen for failed resources
    page.on('requestfailed', (request) => {
      failedResources.add(
        `${request.method()} ${request.url()} - ${request.failure()?.errorText || 'unknown error'}`
      )
    })

    await page.goto(baseUrl)

    // Wait for network idle to ensure all resources are loaded
    await page.waitForLoadState('networkidle')

    // Check if any essential resources failed
    expect(
      Array.from(failedResources).length,
      `Failed resources detected: ${Array.from(failedResources).join('\n')}`
    ).toBe(0)
  })
})
