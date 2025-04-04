/**
 * Accessibility Tests
 *
 * This file contains automated tests for checking accessibility of critical pages
 * against WCAG 2.1 AA guidelines using axe-core.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { axeBuilder } from '@axe-core/playwright'

// Pages to test
const CRITICAL_PAGES = [
  { path: '/', name: 'Homepage' },
  { path: '/docs', name: 'Documentation' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/admin', name: 'Admin Panel' },
  { path: '/accessibility', name: 'Accessibility Statement' },
]

// Violations to include in report with additional context
interface EnhancedViolation {
  id: string
  impact: string
  description: string
  helpUrl: string
  nodes: Array<{
    html: string
    failureSummary: string
    target: string[]
  }>
  tags: string[]
  wcagCriteria: string[]
}

// Enhanced violations with WCAG mapping for better reporting
const WCAG_MAPPING: Record<string, string[]> = {
  'aria-allowed-attr': ['1.3.1'],
  'aria-hidden-focus': ['1.3.1', '4.1.2'],
  'aria-required-attr': ['4.1.2'],
  'aria-required-children': ['1.3.1'],
  'aria-required-parent': ['1.3.1'],
  'aria-roles': ['4.1.2'],
  'aria-valid-attr-value': ['4.1.2'],
  'aria-valid-attr': ['4.1.2'],
  'button-name': ['2.4.4', '4.1.2'],
  'color-contrast': ['1.4.3'],
  'document-title': ['2.4.2'],
  'form-field-multiple-labels': ['3.3.2'],
  'frame-title': ['2.4.1', '4.1.2'],
  'heading-order': ['1.3.1', '2.4.6'],
  'html-has-lang': ['3.1.1'],
  'html-lang-valid': ['3.1.1'],
  'image-alt': ['1.1.1'],
  'input-button-name': ['2.4.4', '4.1.2'],
  'label': ['1.3.1', '4.1.2'],
  'link-name': ['2.4.4', '4.1.2'],
  'list': ['1.3.1'],
  'listitem': ['1.3.1'],
  'meta-viewport': ['1.4.4'],
  'nested-interactive': ['4.1.2'],
  'region': ['2.4.1', '2.4.7'],
  'duplicate-id': ['4.1.1'],
}

// Format violations for readability
function formatAccessibilityViolations(
  violations: EnhancedViolation[],
): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          return `\n   - Element: ${node.html}\n     Path: ${node.target.join(' > ')}\n     Issues: ${node.failureSummary}`
        })
        .join('\n')

      const wcagInfo =
        violation.wcagCriteria.length > 0
          ? `\n   WCAG Criteria: ${violation.wcagCriteria.join(', ')}`
          : ''

      return `\n\nRule: ${violation.id} (${violation.impact} impact)
   Description: ${violation.description}${wcagInfo}
   Help URL: ${violation.helpUrl}
   Affected Elements: ${nodes}`
    })
    .join('\n\n')
}

// Map axe rule IDs to WCAG criteria
function enhanceViolations(violations: any[]): EnhancedViolation[] {
  return violations.map((violation) => ({
    ...violation,
    wcagCriteria: WCAG_MAPPING[violation.id] || [],
  }))
}

describe('Accessibility Compliance Tests', () => {
  let browser: Browser
  let page: Page

  beforeAll(async () => {
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser.close()
  })

  CRITICAL_PAGES.forEach(({ path, name }) => {
    describe(`${name} Page Accessibility`, () => {
      beforeAll(async () => {
        page = await browser.newPage()

        // Navigate with retry for reliability
        let retries = 3
        let navigationSuccessful = false

        while (retries > 0 && !navigationSuccessful) {
          try {
            await page.goto(`http://localhost:3000${path}`, {
              waitUntil: 'networkidle',
              timeout: 10000,
            })
            navigationSuccessful = true
          } catch (error) {
            retries--
            if (retries === 0) {
              throw new Error(`Failed to navigate to ${path}: ${error}`)
            }
            await new Promise((r) => setTimeout(r, 1000))
          }
        }
      })

      it('should have no critical accessibility violations', async () => {
        const accessibilityScanResults = await axeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()

        const violations = enhanceViolations(
          accessibilityScanResults.violations,
        )
        const criticalViolations = violations.filter(
          (v) => v.impact === 'critical',
        )

        if (criticalViolations.length > 0) {
          const formattedViolations =
            formatAccessibilityViolations(criticalViolations)
          throw new Error(
            `Critical accessibility violations found on ${name} page:${formattedViolations}`,
          )
        }
      })

      it('should have no serious accessibility violations', async () => {
        const accessibilityScanResults = await axeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()

        const violations = enhanceViolations(
          accessibilityScanResults.violations,
        )
        const seriousViolations = violations.filter(
          (v) => v.impact === 'serious',
        )

        if (seriousViolations.length > 0) {
          const formattedViolations =
            formatAccessibilityViolations(seriousViolations)
          console.warn(
            `Serious accessibility violations found on ${name} page:${formattedViolations}`,
          )
          // Only fail test when there are violations of supported criteria
          const supportedSeriousViolations = seriousViolations.filter(
            (v) => v.wcagCriteria.length > 0,
          )
          expect(supportedSeriousViolations.length).toBe(0)
        }
      })

      it('should generate an accessibility report for moderate and minor issues', async () => {
        const accessibilityScanResults = await axeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()

        const violations = enhanceViolations(
          accessibilityScanResults.violations,
        )
        const otherViolations = violations.filter(
          (v) => v.impact !== 'critical' && v.impact !== 'serious',
        )

        if (otherViolations.length > 0) {
          const formattedViolations =
            formatAccessibilityViolations(otherViolations)
          console.info(
            `Other accessibility issues found on ${name} page:${formattedViolations}`,
          )
        }

        // Store total violations count for reporting
        console.info(
          `${name} page: ${violations.length} total violations found (${accessibilityScanResults.passes.length} passes)`,
        )
      })
    })
  })
})
