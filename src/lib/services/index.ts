/**
 * Services Index
 *
 * This file exports all available application services.
 */

// Import all service modules
import * as loggingService from './logging'

// Re-export services for easy access
export { loggingService }

// Export specific types and utilities from services
export { type LoggingConfig, loadLoggingConfig } from './logging'

/**
 * Initialize all application services
 * This function should be called early in the application lifecycle
 */
export async function initializeServices() {
  // Add service initialization here
  // Example: await authService.initialize();
}

/**
 * Shutdown all application services
 * This function should be called before application termination
 */
export async function shutdownServices() {
  // Add service cleanup here
  // Example: await authService.shutdown();
}
