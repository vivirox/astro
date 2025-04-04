import {
  expect,
  } from 'vitest'
import { customMatchers } from './test-utils'

// Extend Vitest's expect with custom matchers
expect.extend(customMatchers)

// Make test globals available
declare global {
  var describe: (typeof import('vitest'))['describe']

  var it: (typeof import('vitest'))['it']

  var expect: (typeof import('vitest'))['expect']

  var beforeAll: (typeof import('vitest'))['beforeAll']

  var afterAll: (typeof import('vitest'))['afterAll']

  var beforeEach: (typeof import('vitest'))['beforeEach']

  var afterEach: (typeof import('vitest'))['afterEach']
}
