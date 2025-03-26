import { auth } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { BreachNotificationSystem } from '@/lib/security/breach-notification'
import { expect, test } from '@playwright/test'

test.describe('Breach Notification System E2E', () => {
  const mockBreachDetails = {
    type: 'unauthorized_access' as const,
    severity: 'high' as const,
    description: 'Suspicious login activity detected',
    affectedUsers: ['test_user_1', 'test_user_2'],
    affectedData: ['personal_info', 'login_history'],
    detectionMethod: 'anomaly_detection',
    remediation: 'Forced password reset and session invalidation',
  }

  test.beforeAll(async () => {
    // Setup test environment
    process.env.NODE_ENV = 'test'
    process.env.ORGANIZATION_NAME = 'Test Healthcare'
    process.env.SECURITY_CONTACT = 'security@test-healthcare.com'
    process.env.ORGANIZATION_ADDRESS =
      '123 Healthcare Ave, Medical City, MC 12345'
    process.env.HHS_NOTIFICATION_EMAIL = 'hhs-test@example.com'
    process.env.SECURITY_STAKEHOLDERS = 'security-team@test-healthcare.com'

    // Create test users
    await auth.createUser({
      id: 'test_user_1',
      email: 'patient1@example.com',
      name: 'Test Patient 1',
    })

    await auth.createUser({
      id: 'test_user_2',
      email: 'patient2@example.com',
      name: 'Test Patient 2',
    })
  })

  test.afterAll(async () => {
    // Cleanup test data
    const keys = await redis.keys('breach:*')
    await Promise.all(keys.map((key) => redis.del(key)))

    // Remove test users
    await auth.deleteUser('test_user_1')
    await auth.deleteUser('test_user_2')
  })

  test.beforeEach(async ({ page }) => {
    // Reset email service mock
    await page.route('**/api/email', async (route) => {
      const request = route.request()
      if (request.method() === 'POST') {
        await route.fulfill({ status: 200 })
      }
    })
  })

  test('should create and process a security breach notification', async ({
    page,
  }) => {
    // Report the breach
    const breachId =
      await BreachNotificationSystem.reportBreach(mockBreachDetails)
    expect(breachId).toBeTruthy()

    // Verify breach was stored
    const breach = await BreachNotificationSystem.getBreachStatus(breachId)
    expect(breach).toBeTruthy()
    expect(breach?.notificationStatus).toBe('completed')

    // Navigate to security dashboard
    await page.goto('/admin/security')
    await page.waitForLoadState('networkidle')

    // Check breach appears in the list
    const breachRow = page.locator(`[data-testid="breach-${breachId}"]`)
    await expect(breachRow).toBeVisible()
    await expect(breachRow.locator('[data-testid="breach-type"]')).toHaveText(
      mockBreachDetails.type,
    )
    await expect(
      breachRow.locator('[data-testid="breach-severity"]'),
    ).toHaveText(mockBreachDetails.severity)

    // Check notification details
    await breachRow.click()
    const detailsDialog = page.locator('[data-testid="breach-details-dialog"]')
    await expect(detailsDialog).toBeVisible()
    await expect(
      detailsDialog.locator('[data-testid="affected-users-count"]'),
    ).toHaveText(String(mockBreachDetails.affectedUsers.length))
    await expect(
      detailsDialog.locator('[data-testid="notification-status"]'),
    ).toHaveText('completed')

    // Verify email notifications
    const emailRequests = await page.requests.filter(
      (request) =>
        request.url().includes('/api/email') && request.method() === 'POST',
    )

    // Should have sent emails to:
    // - 2 affected users
    // - 1 security stakeholder
    // - 1 HHS notification (high severity)
    expect(emailRequests).toHaveLength(4)

    // Check user notification content
    const userEmails = emailRequests.filter(
      (request) => request.postDataJSON().metadata.type === 'security_breach',
    )
    expect(userEmails).toHaveLength(2)

    // Check HHS notification
    const hhsEmail = emailRequests.find(
      (request) =>
        request.postDataJSON().metadata.type === 'hipaa_breach_notification',
    )
    expect(hhsEmail).toBeTruthy()

    // Check stakeholder notification
    const stakeholderEmail = emailRequests.find(
      (request) =>
        request.postDataJSON().metadata.type === 'internal_breach_notification',
    )
    expect(stakeholderEmail).toBeTruthy()
  })

  test('should handle critical severity breach with proper escalation', async ({
    page,
  }) => {
    const criticalBreachDetails = {
      ...mockBreachDetails,
      severity: 'critical' as const,
      description: 'Major data breach detected',
      affectedUsers: Array.from({ length: 600 })
        .fill('')
        .map((_, i) => `user_${i}`),
      affectedData: ['phi', 'financial_data', 'medical_records'],
    }

    // Report the critical breach
    const breachId = await BreachNotificationSystem.reportBreach(
      criticalBreachDetails,
    )
    expect(breachId).toBeTruthy()

    // Navigate to security dashboard
    await page.goto('/admin/security')
    await page.waitForLoadState('networkidle')

    // Verify critical breach UI indicators
    const breachRow = page.locator(`[data-testid="breach-${breachId}"]`)
    await expect(breachRow).toBeVisible()
    await expect(breachRow).toHaveClass(/critical/)
    await expect(
      breachRow.locator('[data-testid="breach-severity"]'),
    ).toHaveText('critical')

    // Check escalation notifications
    const emailRequests = await page.requests.filter(
      (request) =>
        request.url().includes('/api/email') && request.method() === 'POST',
    )

    // Should have sent priority notifications
    expect(
      emailRequests.every(
        (request) => request.postDataJSON().priority === 'urgent',
      ),
    ).toBe(true)

    // Verify HHS notification for large-scale breach
    const hhsEmail = emailRequests.find(
      (request) =>
        request.postDataJSON().metadata.type === 'hipaa_breach_notification',
    )
    expect(hhsEmail).toBeTruthy()
    expect(
      JSON.parse(hhsEmail.postDataJSON().body).breach.affectedIndividuals,
    ).toBe(600)
  })

  test('should display breach history and allow filtering', async ({
    page,
  }) => {
    // Create multiple breaches with different severities
    const breaches = [
      { ...mockBreachDetails, severity: 'low' as const },
      { ...mockBreachDetails, severity: 'medium' as const },
      { ...mockBreachDetails, severity: 'high' as const },
      { ...mockBreachDetails, severity: 'critical' as const },
    ]

    for (const breach of breaches) {
      await BreachNotificationSystem.reportBreach(breach)
    }

    // Navigate to security dashboard
    await page.goto('/admin/security')
    await page.waitForLoadState('networkidle')

    // Check all breaches are listed
    const breachRows = page.locator('[data-testid^="breach-"]')
    await expect(breachRows).toHaveCount(breaches.length)

    // Test severity filter
    await page.selectOption('[data-testid="severity-filter"]', 'critical')
    await expect(breachRows).toHaveCount(1)
    await expect(page.locator('[data-testid="breach-severity"]')).toHaveText(
      'critical',
    )

    // Test date range filter
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    await page.fill(
      '[data-testid="date-from"]',
      today.toISOString().split('T')[0],
    )
    await page.fill(
      '[data-testid="date-to"]',
      tomorrow.toISOString().split('T')[0],
    )
    await page.click('[data-testid="apply-filters"]')

    // Should show all breaches (all were created today)
    await expect(breachRows).toHaveCount(breaches.length)

    // Test search
    await page.fill('[data-testid="search-input"]', 'Suspicious login')
    await expect(breachRows).toHaveCount(breaches.length)

    await page.fill('[data-testid="search-input"]', 'nonexistent')
    await expect(breachRows).toHaveCount(0)
  })

  test('should handle breach notification preferences', async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'patient1@example.com')
    await page.fill('[data-testid="password"]', 'testpassword')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')

    // Navigate to notification preferences
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="notification-preferences"]')

    // Update notification preferences
    await page.click('[data-testid="security-notifications-toggle"]')
    await page.selectOption('[data-testid="notification-channel"]', 'email')
    await page.click('[data-testid="save-preferences"]')

    // Create a new breach affecting the user
    const breachId = await BreachNotificationSystem.reportBreach({
      ...mockBreachDetails,
      affectedUsers: ['test_user_1'],
    })

    // Verify notification was sent according to preferences
    const emailRequests = await page.requests.filter(
      (request) =>
        request.url().includes('/api/email') &&
        request.method() === 'POST' &&
        request.postDataJSON().to === 'patient1@example.com',
    )

    expect(emailRequests).toHaveLength(1)
    expect(emailRequests[0].postDataJSON().metadata.breachId).toBe(breachId)
  })
})
