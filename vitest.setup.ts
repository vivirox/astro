import '@testing-library/jest-dom'
import {
  expect,
  afterEach,
  } from 'vitest'
import { cleanup } from '@testing-library/react'
import matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with @testing-library/jest-dom's matchers
expect.extend(matchers)

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Make test globals available
declare global {
  // Use namespace instead of individual var declarations
  namespace NodeJS {
    interface Global {
      describe: typeof import('vitest')['describe']
      it: typeof import('vitest')['it']
      expect: typeof import('vitest')['expect']
      beforeAll: typeof import('vitest')['beforeAll']
      afterAll: typeof import('vitest')['afterAll']
      beforeEach: typeof import('vitest')['beforeEach']
      afterEach: typeof import('vitest')['afterEach']
    }
  }
}
