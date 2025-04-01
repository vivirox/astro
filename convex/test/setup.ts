import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { DatabaseWriter } from '../_generated/server'
import { cleanupTestData } from '../lib/test-utils'

let ctx: DatabaseWriter

beforeAll(async () => {
  // Initialize test environment
  process.env.NODE_ENV = 'test'
  process.env.CONVEX_URL = 'http://127.0.0.1:8000'
  process.env.CONVEX_DEPLOY_KEY = 'test-deploy-key'

  // Add any additional test environment setup here
})

afterAll(async () => {
  // Clean up test environment
  await cleanupTestData(ctx)
})

beforeEach(async () => {
  // Reset database state before each test
  await cleanupTestData(ctx)
})

afterEach(async () => {
  // Clean up after each test
  await cleanupTestData(ctx)
})
