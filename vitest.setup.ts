import '@testing-library/jest-dom'
import {
  expect,
  afterEach,
  describe,
  it,
  beforeAll,
  beforeEach,
  afterAll,
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
  // eslint-disable-next-line no-var
  var describe: (typeof import('vitest'))['describe']
  // eslint-disable-next-line no-var
  var it: (typeof import('vitest'))['it']
  // eslint-disable-next-line no-var
  var expect: (typeof import('vitest'))['expect']
  // eslint-disable-next-line no-var
  var beforeAll: (typeof import('vitest'))['beforeAll']
  // eslint-disable-next-line no-var
  var afterAll: (typeof import('vitest'))['afterAll']
  // eslint-disable-next-line no-var
  var beforeEach: (typeof import('vitest'))['beforeEach']
  // eslint-disable-next-line no-var
  var afterEach: (typeof import('vitest'))['afterEach']
}
