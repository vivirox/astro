/**
 * Accessibility Testing Utilities
 *
 * This file provides helper functions for accessibility testing in component tests.
 * It wraps axe-core functionality and provides custom matchers for Jest/Vitest.
 */

// Type augmentation for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoAccessibilityViolations(minimumImpact?: ImpactValue): R
    }
  }

  interface Assertion<T = any> {
    toHaveNoAccessibilityViolations(minimumImpact?: ImpactValue): T
  }

  interface AsymmetricMatchersContaining {
    toHaveNoAccessibilityViolations(minimumImpact?: ImpactValue): void
  }
}

import {
  type AxeResults,
  type ImpactValue,
  type Result,
  type RunOptions,
} from 'axe-core'
// Note: We're not importing 'configure' since it's causing type issues

// Impact levels from most severe to least severe
const IMPACT_LEVELS: ImpactValue[] = [
  'critical',
  'serious',
  'moderate',
  'minor',
]

export const WCAG_MAPPING: Record<string, string[]> = {
  // Perceivable
  'aria-hidden-focus': ['1.3.1', '4.1.2'],
  'aria-input-field-name': ['1.3.1', '4.1.2'],
  'color-contrast': ['1.4.3'],
  'document-title': ['2.4.2'],
  'image-alt': ['1.1.1'],
  'link-name': ['2.4.4', '4.1.2'],
  'list': ['1.3.1'],
  'meta-viewport': ['1.4.4'],
  'table-fake-caption': ['1.3.1'],

  // Operable
  'button-name': ['2.4.4', '4.1.2'],
  'frame-title': ['2.4.1', '4.1.2'],
  'html-has-lang': ['3.1.1'],
  'html-lang-valid': ['3.1.1'],
  'keyboard': ['2.1.1'],
  'tabindex': ['2.4.3'],

  // Understandable
  'definition-list': ['1.3.1'],
  'dlitem': ['1.3.1'],
  'duplicate-id': ['4.1.1'],
  'label': ['1.3.1', '3.3.2', '4.1.2'],
  'landmark-one-main': ['1.3.1', '2.4.1'],

  // Robust
  'aria-allowed-attr': ['4.1.2'],
  'aria-required-attr': ['4.1.2'],
  'aria-required-children': ['1.3.1', '4.1.2'],
  'aria-required-parent': ['1.3.1', '4.1.2'],
  'aria-roles': ['1.3.1', '4.1.2'],
  'aria-valid-attr': ['4.1.2'],
  'aria-valid-attr-value': ['4.1.2'],
}

/**
 * Enhanced violation object with WCAG criteria mapping
 */
export interface EnhancedViolation extends Result {
  wcagCriteria?: string[]
  impactWeight?: number
}

/**
 * Default configuration for axe
 */
export const defaultAxeConfig: RunOptions = {
  // Define options without the problematic rules property
  // We'll apply rules separately when using the runner
}

/**
 * Configures axe with default options
 * Note: This needs to be used with a proper axe instance in test files
 */
export function getAxeOptions(options: RunOptions = {}): RunOptions {
  return {
    ...defaultAxeConfig,
    ...options,
  }
}

/**
 * Enhances axe violation results with WCAG criteria
 */
export function enhanceViolations(violations: Result[]): EnhancedViolation[] {
  return violations.map((violation) => {
    const enhancedViolation = violation as EnhancedViolation
    enhancedViolation.wcagCriteria = WCAG_MAPPING[violation.id] || []
    // Add weight based on impact for sorting
    enhancedViolation.impactWeight = violation.impact
      ? IMPACT_LEVELS.indexOf(violation.impact)
      : IMPACT_LEVELS.length
    return enhancedViolation
  })
}

/**
 * Filters violations by minimum impact level
 */
export function filterViolationsByImpact(
  violations: EnhancedViolation[],
  minimumImpact: ImpactValue,
): EnhancedViolation[] {
  const minimumImpactIndex = IMPACT_LEVELS.indexOf(minimumImpact)
  return violations.filter((violation) => {
    if (!violation.impact) {
      return false
    }
    const violationImpactIndex = IMPACT_LEVELS.indexOf(violation.impact)
    return violationImpactIndex <= minimumImpactIndex
  })
}

/**
 * Formats a violation for console output
 */
export function formatViolation(violation: EnhancedViolation): string {
  const wcagInfo = violation.wcagCriteria?.length
    ? `(WCAG ${violation.wcagCriteria.join(', ')})`
    : ''

  const nodeInfo = violation.nodes
    .map((node, i) => {
      return `\n  ${i + 1}) ${node.html}\n     ${node.failureSummary?.split('\n').join('\n     ')}`
    })
    .join('')

  return [
    `${violation.impact?.toUpperCase() || 'UNKNOWN'}: ${violation.help} ${wcagInfo}`,
    `  Description: ${violation.description}`,
    `  Help: ${violation.helpUrl}`,
    `  Elements:${nodeInfo}`,
  ].join('\n')
}

/**
 * Checks if axe results contain any accessibility violations at the specified impact level or higher
 */
export function hasAccessibilityViolations(
  results: AxeResults,
  minimumImpact: ImpactValue = 'serious',
): boolean {
  const enhancedViolations = enhanceViolations(results.violations)
  const filteredViolations = filterViolationsByImpact(
    enhancedViolations,
    minimumImpact,
  )
  return filteredViolations.length > 0
}

/**
 * Formats all violations for reporting
 */
export function formatViolationsForReport(violations: Result[]): string {
  const enhancedViolations = enhanceViolations(violations).sort(
    (a, b) => (a.impactWeight ?? 4) - (b.impactWeight ?? 4),
  )

  if (enhancedViolations.length === 0) {
    return 'No accessibility violations found.'
  }

  const report = enhancedViolations.map(formatViolation).join('\n\n')
  return `Found ${enhancedViolations.length} accessibility violation(s):\n\n${report}`
}

/**
 * Generates a summary of violations by impact level
 */
export function getViolationSummary(violations: Result[]): string {
  if (violations.length === 0) {
    return 'No accessibility violations detected.'
  }

  const byImpact: Record<string, number> = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    unknown: 0,
  }

  violations.forEach((violation) => {
    if (violation.impact) {
      byImpact[violation.impact]++
    } else {
      byImpact.unknown++
    }
  })

  return [
    `Found ${violations.length} accessibility violations:`,
    `- Critical: ${byImpact.critical}`,
    `- Serious: ${byImpact.serious}`,
    `- Moderate: ${byImpact.moderate}`,
    `- Minor: ${byImpact.minor}`,
    byImpact.unknown > 0 ? `- Unknown: ${byImpact.unknown}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Custom Jest/Vitest matcher to check for accessibility violations
 */
export const toHaveNoAccessibilityViolations = function (
  this: any,
  received: AxeResults,
  minimumImpact: ImpactValue = 'serious',
) {
  const enhancedViolations = enhanceViolations(received.violations)
  const filteredViolations = filterViolationsByImpact(
    enhancedViolations,
    minimumImpact,
  )

  const pass = filteredViolations.length === 0

  if (pass) {
    return {
      pass: true,
      message: () => 'Expected accessibility violations but none were found.',
    }
  }

  return {
    pass: false,
    message: () => formatViolationsForReport(filteredViolations),
  }
}

/**
 * Extends Jest/Vitest with custom matchers
 */
export function setupAccessibilityMatchers() {
  expect.extend({
    toHaveNoAccessibilityViolations,
  })
}
