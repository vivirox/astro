/**
 * Accessibility testing utilities for Astro components
 *
 * This file provides utilities to help test Astro components for accessibility issues
 * using axe-core. It includes helpers for rendering Astro components and running
 * accessibility checks against them.
 */

import type { AxeResults, Result, NodeResult } from 'jest-axe'
import { axe } from 'jest-axe'
import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

/**
 * Format accessibility violations for better readability in test output
 */
export function formatViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node: NodeResult) => {
          return `\n- ${node.html}\n  ${node.failureSummary}`
        })
        .join('\n')

      return `\n\nViolation: ${violation.help} (${violation.id})\nImpact: ${violation.impact}\nDescription: ${violation.description}\nTags: ${violation.tags.join(', ')}\nAffected Nodes: ${nodes}`
    })
    .join('\n\n')
}

/**
 * Renders an Astro component to HTML and appends it to the document
 * so it can be tested with axe-core
 */
export async function renderAstroComponent(
  Component: AstroComponentFactory,
  props = {},
) {
  const html = await Component?.render?.(props)
  if (!html) {
    throw new Error('Failed to render Astro component')
  }

  const container = document.createElement('div')
  container.innerHTML = html.html
  document.body.appendChild(container)

  return { container }
}

/**
 * Run axe-core accessibility checks on an Astro component
 *
 * @param Component The Astro component to test
 * @param props Props to pass to the component
 * @returns Promise resolving to axe results
 */
export async function checkAstroComponentA11y(
  Component: AstroComponentFactory,
  props = {},
): Promise<AxeResults> {
  const { container } = await renderAstroComponent(Component, props)

  try {
    return await axe(container)
  } finally {
    // Clean up
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}

/**
 * Wrap an axe test to include better error reporting
 *
 * @param axeCheck Promise from running axe
 */
export async function expectNoA11yViolations(axeCheck: Promise<AxeResults>) {
  const results = await axeCheck

  if (results.violations.length > 0) {
    throw new Error(
      `Accessibility violations found:\n${formatViolations(results.violations)}`,
    )
  }

  return results
}

/**
 * Common accessibility rules to check in tests
 */
export const accessibilityRules = {
  // These rules can be passed to axe() to focus on specific a11y issues
  color: {
    'color-contrast': { enabled: true },
  },
  keyboard: {
    'tabindex': { enabled: true },
    'focus-trap': { enabled: true },
  },
  screenReader: {
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-valid-attr': { enabled: true },
  },
}
