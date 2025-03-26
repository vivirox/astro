/**
 * Browser setup utilities
 */
import { getSupportedFeatures } from './feature-detection'

/**
 * Initialize browser feature detection
 */
export function initializeFeatureDetection(): void {
  if (typeof window !== 'undefined') {
    // Add feature detection results to window
    const features = getSupportedFeatures()
    ;(window as any).__FEATURES__ = features
  }
}

/**
 * Get supported features from the page
 */
export function getPageFeatures(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    return {}
  }
  return (window as any).__FEATURES__ || {}
}

// Initialize feature detection when this module loads
initializeFeatureDetection()
