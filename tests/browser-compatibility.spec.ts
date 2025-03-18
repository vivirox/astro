import { test, expect } from '@playwright/test';

// Test the browser compatibility test page
test.describe('Browser Compatibility Tests', () => {
  test('should load browser compatibility test page', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    await expect(page).toHaveTitle(/Browser Compatibility Testing/);
    
    // Check that the browser information section is present
    await expect(page.locator('h2:has-text("Browser Information")')).toBeVisible();
    
    // Check that the feature support table is present
    await expect(page.locator('table')).toBeVisible();
    
    // Check that the AI Chat component is present
    await expect(page.locator('h2:has-text("AI Chat Component Test")')).toBeVisible();
    
    // Check that the loading indicator test is present
    await expect(page.locator('h2:has-text("Loading Indicator Test")')).toBeVisible();
  });
  
  test('should detect browser features correctly', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    
    // Wait for feature detection to complete
    await page.waitForSelector('table tbody tr');
    
    // Check that CSS Grid is supported
    const cssGridRow = page.locator('table tbody tr', { hasText: 'CSS Grid' });
    await expect(cssGridRow.locator('td:nth-child(2)')).toContainText('Yes');
    
    // Check that Fetch API is supported
    const fetchApiRow = page.locator('table tbody tr', { hasText: 'Fetch API' });
    await expect(fetchApiRow.locator('td:nth-child(2)')).toContainText('Yes');
    
    // Check that LocalStorage is supported
    const localStorageRow = page.locator('table tbody tr', { hasText: 'LocalStorage' });
    await expect(localStorageRow.locator('td:nth-child(2)')).toContainText('Yes');
  });
  
  test('should load AI Chat component', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    
    // Check that the AI Chat component is present
    const chatComponent = page.locator('.component-container');
    await expect(chatComponent).toBeVisible();
    
    // Check that the input field is present
    const inputField = chatComponent.locator('input[type="text"]');
    await expect(inputField).toBeVisible();
    
    // Check that the send button is present
    const sendButton = chatComponent.locator('button[type="submit"]');
    await expect(sendButton).toBeVisible();
  });
  
  test('should load loading indicators', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    
    // Check that the loading indicators are present
    const loadingIndicators = page.locator('.loading-indicators-test > div');
    await expect(loadingIndicators).toHaveCount(3);
    
    // Check that each loading indicator has the correct size
    await expect(loadingIndicators.nth(0).locator('h4')).toContainText('Small');
    await expect(loadingIndicators.nth(1).locator('h4')).toContainText('Medium');
    await expect(loadingIndicators.nth(2).locator('h4')).toContainText('Large');
  });
  
  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    
    // Focus on the first input field
    await page.keyboard.press('Tab');
    
    // Check that the browser input field is focused
    await expect(page.locator('#browser')).toBeFocused();
    
    // Navigate to the component dropdown
    await page.keyboard.press('Tab');
    await expect(page.locator('#component')).toBeFocused();
    
    // Navigate to the issue textarea
    await page.keyboard.press('Tab');
    await expect(page.locator('#issue')).toBeFocused();
    
    // Navigate to the severity dropdown
    await page.keyboard.press('Tab');
    await expect(page.locator('#severity')).toBeFocused();
    
    // Navigate to the submit button
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });
  
  test('should log compatibility issues', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    
    // Fill out the form
    await page.fill('#browser', 'Test Browser');
    await page.selectOption('#component', 'ai-chat');
    await page.fill('#issue', 'Test issue description');
    await page.selectOption('#severity', 'minor');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Check that the issue is logged
    await expect(page.locator('.issue-item')).toBeVisible();
    await expect(page.locator('.issue-browser')).toContainText('Test Browser');
    await expect(page.locator('.issue-component')).toContainText('ai-chat');
    await expect(page.locator('.issue-body')).toContainText('Test issue description');
    await expect(page.locator('.issue-severity')).toContainText('minor');
    
    // Delete the issue
    await page.click('.delete-issue');
    
    // Check that the issue is deleted
    await expect(page.locator('.issue-item')).not.toBeVisible();
    await expect(page.locator('#issues-container')).toContainText('No issues reported yet');
  });
});

// Test accessibility features
test.describe('Accessibility Tests', () => {
  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    
    // Check that sections have proper ARIA labels
    await expect(page.locator('section[aria-labelledby="browser-info-heading"]')).toBeVisible();
    await expect(page.locator('section[aria-labelledby="feature-support-heading"]')).toBeVisible();
    
    // Check that headings have proper IDs
    await expect(page.locator('#browser-info-heading')).toBeVisible();
    await expect(page.locator('#feature-support-heading')).toBeVisible();
    
    // Check that form labels are properly associated with inputs
    await expect(page.locator('label[for="browser"]')).toBeVisible();
    await expect(page.locator('label[for="component"]')).toBeVisible();
    await expect(page.locator('label[for="issue"]')).toBeVisible();
    await expect(page.locator('label[for="severity"]')).toBeVisible();
  });
  
  test('should have accessible loading indicators', async ({ page }) => {
    await page.goto('/dev/browser-compatibility-test');
    
    // Check that loading indicators have proper ARIA attributes
    const loadingIndicator = page.locator('.loading-indicators-test > div').first();
    const statusElement = loadingIndicator.locator('[role="status"]');
    
    await expect(statusElement).toBeVisible();
    await expect(statusElement.locator('[aria-live="polite"]')).toBeVisible();
    await expect(statusElement.locator('.sr-only')).toBeVisible();
  });
});

// Test browser-specific features
test.describe('Browser-Specific Tests', () => {
  test('should detect reduced motion preference', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dev/browser-compatibility-test');
    
    // Wait for feature detection to complete
    await page.waitForSelector('table tbody tr');
    
    // Check that reduced motion is detected as active
    const reducedMotionRow = page.locator('table tbody tr', { hasText: 'Reduced Motion Support' });
    await expect(reducedMotionRow.locator('td:nth-child(2)')).toContainText('Active');
  });
  
  test('should detect high contrast mode', async ({ page, browserName }) => {
    // Skip this test in browsers that don't support forced-colors media query
    test.skip(browserName !== 'chromium', 'High contrast detection only works in Chromium');
    
    // Emulate high contrast mode (only works in Chromium)
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/dev/browser-compatibility-test');
    
    // Wait for feature detection to complete
    await page.waitForSelector('table tbody tr');
    
    // Check that high contrast mode is detected as active
    const highContrastRow = page.locator('table tbody tr', { hasText: 'High Contrast Mode' });
    await expect(highContrastRow.locator('td:nth-child(2)')).toContainText('Active');
  });
});

// Run tests in multiple browsers
test.describe('Multi-Browser Tests', () => {
  // This will run the same test in all configured browsers
  test('should work in all browsers', async ({ page, browserName }) => {
    test.info().annotations.push({
      type: 'browser',
      description: browserName
    });
    
    await page.goto('/dev/browser-compatibility-test');
    
    // Log browser information for reporting
    const userAgent = await page.evaluate(() => navigator.userAgent);
    test.info().annotations.push({
      type: 'user-agent',
      description: userAgent
    });
    
    // Basic functionality check
    await expect(page.locator('h1')).toContainText('Browser Compatibility Testing');
    await expect(page.locator('.component-container')).toBeVisible();
    await expect(page.locator('.loading-indicators-test')).toBeVisible();
  });
}); 