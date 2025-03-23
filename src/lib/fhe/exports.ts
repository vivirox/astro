/**
 * Unified export file for FHE functionality
 */

// FHE service entry point - exports all required types and functions
// for use in the application

// Main FHE service instance
export { fheService } from './index'

// Import core services
import { HomomorphicOperations } from './homomorphic-ops'
import { KeyRotationService } from './key-rotation'
import { FHEAnalyticsService } from './analytics'

// Re-export classes
export { HomomorphicOperations, KeyRotationService, FHEAnalyticsService }

// Initialization functions
export async function initializeHomomorphicOps(): Promise<void> {
  const homomorphicOps = HomomorphicOperations.getInstance()
  await homomorphicOps.initialize()
}

export async function initializeKeyRotation(): Promise<void> {
  const keyRotation = KeyRotationService.getInstance()
  await keyRotation.initialize()
}

export async function initializeFHEAnalytics(): Promise<void> {
  const analytics = FHEAnalyticsService.getInstance()
  await analytics.initialize()
}

// Re-export types explicitly to avoid ambiguity
export type {
  FHEConfig,
  EncryptionOptions,
  HomomorphicOperationResult,
  TFHEContext,
} from './types'
export { EncryptionMode, FHEOperation } from './types'
