import { logger } from '../../../../utils/logger'

/**
 * Global setup function for Vitest - runs before any tests
 */
export async function setup() {
  logger.info('Starting test suite setup')
  // Initialize any test resources here
}

/**
 * Global teardown function for Vitest - runs after all tests
 */
export async function teardown() {
  logger.info('Performing test suite cleanup')
  // Clean up any test resources here
}
