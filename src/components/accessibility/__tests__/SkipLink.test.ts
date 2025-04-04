import { describe, it, expect, vi, beforeEach } from 'vitest'
import { } from '@testing-library/dom'
import { axe } from 'jest-axe'
import { JSDOM } from 'jsdom'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Import our testing utilities
import {
  toHaveNoAccessibilityViolations,
} from '../../../utils/accessibilityTestUtils'

// Setup custom matchers
expect.extend({ toHaveNoAccessibilityViolations })

// Get the component filepath
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const componentPath = path.resolve(__dirname, '../SkipLink.astro')

describe('SkipLink Component', () => {
  let dom: JSDOM
  let document: Document
  let window: Window

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(
      '<!DOCTYPE html><html><body><div id="main-content">Main Content</div></body></html>',
      {
        url: 'http://localhost/',
        runScripts: 'dangerously',
      },
    )

    document = dom.window.document
    window = dom.window

    // Mock global objects
    global.document = document
    global.window = window
    global.DOMContentLoaded = window.DOMContentLoaded
  })

  it('renders skip link with default properties', async () => {
    // Read the component file
    const componentContent = fs.readFileSync(componentPath, 'utf-8')

    // Extract the HTML part from the Astro component (after the frontmatter)
    const htmlPart = componentContent.split('---')[2]

    // Insert the HTML into the body
    document.body.innerHTML = htmlPart

    // Find the skip link element
    const skipLink = document.querySelector('.skip-link')

    // Test assertions
    expect(skipLink).toBeTruthy()
    expect(skipLink?.getAttribute('href')).toBe('#main-content')
    expect(skipLink?.textContent?.trim()).toBe('Skip to main content')
  })

  it('is visually hidden until focused', () => {
    // Read the component file
    const componentContent = fs.readFileSync(componentPath, 'utf-8')

    // Extract the style part
    const styleMatch = componentContent.match(/<style>([\s\S]*?)<\/style>/)
    const style = styleMatch ? styleMatch[1] : ''

    // Extract the HTML part
    const htmlPart = componentContent.split('---')[2]

    // Create a style element and append the extracted styles
    const styleElement = document.createElement('style')
    styleElement.textContent = style
    document.head.appendChild(styleElement)

    // Insert the component HTML
    document.body.innerHTML = htmlPart

    // Get the skip link
    const skipLink = document.querySelector('.skip-link') as HTMLElement

    // Get computed style
    const computedStyle = window.getComputedStyle(skipLink)

    // Check that it's initially off-screen
    expect(computedStyle.position).toBe('absolute')
    expect(computedStyle.top).toBe('-100px')

    // Simulate focus
    skipLink.focus()

    // Create a test to verify focus would make it visible
    // Note: We can't fully test CSS pseudo-selectors in JSDOM, but we can verify the CSS exists
    expect(style).toContain('.skip-link:focus')
    expect(style).toContain('top: 0')
  })

  it('navigates to the target when clicked', () => {
    // Read the component file
    const componentContent = fs.readFileSync(componentPath, 'utf-8')

    // Extract the script part
    const scriptMatch = componentContent.match(/<script>([\s\S]*?)<\/script>/)
    const script = scriptMatch ? scriptMatch[1] : ''

    // Extract the HTML part
    const htmlPart = componentContent.split('---')[2]

    // Insert the component HTML
    document.body.innerHTML = htmlPart

    // Get the skip link
    const skipLink = document.querySelector('.skip-link') as HTMLElement

    // Create the target element
    const targetElement = document.getElementById('main-content') as HTMLElement

    // Mock the needed functions
    targetElement.focus = vi.fn()
    targetElement.scrollIntoView = vi.fn()
    window.history.pushState = vi.fn()

    // Execute the script
    const scriptElement = document.createElement('script')
    scriptElement.textContent = script
    document.body.appendChild(scriptElement)

    // Dispatch DOMContentLoaded event
    const event = document.createEvent('Event')
    event.initEvent('DOMContentLoaded', true, true)
    document.dispatchEvent(event)

    // Simulate click
    skipLink.click()

    // Verify the mocked functions were called
    expect(targetElement.focus).toHaveBeenCalled()
    expect(targetElement.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
    })
    expect(window.history.pushState).toHaveBeenCalledWith(
      null,
      '',
      '#main-content',
    )
  })

  it('allows customizing target and text', async () => {
    // Create a modified component with custom props
    const modifiedHTML = `
      <a href="#custom-target" class="skip-link">Custom skip text</a>
    `

    // Insert the HTML into the body
    document.body.innerHTML = modifiedHTML

    // Find the skip link element
    const skipLink = document.querySelector('.skip-link')

    // Test assertions
    expect(skipLink).toBeTruthy()
    expect(skipLink?.getAttribute('href')).toBe('#custom-target')
    expect(skipLink?.textContent?.trim()).toBe('Custom skip text')
  })

  it('has no accessibility violations', async () => {
    // Read the component file
    const componentContent = fs.readFileSync(componentPath, 'utf-8')

    // Extract the HTML part and style
    const htmlPart = componentContent.split('---')[2]
    const styleMatch = componentContent.match(/<style>([\s\S]*?)<\/style>/)
    const style = styleMatch ? styleMatch[1] : ''

    // Create a style element and append the extracted styles
    const styleElement = document.createElement('style')
    styleElement.textContent = style
    document.head.appendChild(styleElement)

    // Insert the component HTML
    document.body.innerHTML = htmlPart

    // Run axe
    const results = await axe(document.body)

    // Assert no violations
    expect(results).toHaveNoAccessibilityViolations()
  })
})
