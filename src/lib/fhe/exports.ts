/**
 * Unified export file for FHE functionality
 */

// FHE service entry point - exports all required types and functions
// for use in the application

import { FHEAnalyticsService } from './analytics'
// Main FHE service instance
// Import core services
import { HomomorphicOperations } from './homomorphic-ops'
import { KeyRotationService } from './key-rotation'

export { fheService } from './index'

// Re-export classes
export { FHEAnalyticsService, HomomorphicOperations, KeyRotationService }

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
  EncryptionOptions,
  FHEConfig,
  HomomorphicOperationResult,
  TFHEContext,
} from './types'
export { EncryptionMode, FHEOperation } from './types'
