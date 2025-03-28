import { TextDecoder, TextEncoder } from 'node:util'
import { vi, expect, beforeAll, afterAll, afterEach } from 'vitest'
import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock requestAnimationFrame
global.requestAnimationFrame = vi
  .fn()
  .mockImplementation((cb) => setTimeout(cb, 0))
global.cancelAnimationFrame = vi
  .fn()
  .mockImplementation((id) => clearTimeout(id))

// Mock crypto for FHE operations
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      return arr.map(() => Math.floor(Math.random() * 256))
    },
    subtle: {
      generateKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
  },
})

// Make Jest globals available
declare global {
  namespace NodeJS {
    interface Global {
      expect: typeof expect
      it: typeof it
      describe: typeof describe
      beforeAll: typeof beforeAll
      beforeEach: typeof beforeEach
      afterAll: typeof afterAll
      afterEach: typeof afterEach
      jest: typeof jest
    }
  }
}

// Mock console methods to avoid noise in tests
const originalConsole = { ...console }

beforeAll(() => {
  console.log = vi.fn()
  console.error = vi.fn()
  console.warn = vi.fn()
  console.info = vi.fn()
})

afterAll(() => {
  console.log = originalConsole.log
  console.error = originalConsole.error
  console.warn = originalConsole.warn
  console.info = originalConsole.info
})

// Reset mocks between tests
afterEach(() => {
  vi.clearAllMocks()
})

// Add custom matchers if needed
expect.extend({
  // Add custom matchers here
})
