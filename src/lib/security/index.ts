import { initializeSecurityDatabase } from "../db/security/initialize";
import {
  SecurityMonitoringService,
  SecurityEventType,
  SecurityEventSeverity,
} from "./monitoring";
import { getLogger } from "../logging";

const logger = getLogger();

/**
 * Global security monitoring service instance
 */
let securityMonitoringService: SecurityMonitoringService | null = null;

/**
 * Initialize security module
 * This should be called during application startup
 */
export async function initializeSecurity(): Promise<void> {
  try {
    logger.info("Initializing security module...");

    // Initialize security database
    await initializeSecurityDatabase();

    // Create the security monitoring service
    securityMonitoringService = new SecurityMonitoringService();

    logger.info("Security module initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize security module", error);
    throw error;
  }
}

/**
 * Get the security monitoring service instance
 * Creates a new instance if one doesn't exist
 */
export function getSecurityMonitoring(): SecurityMonitoringService {
  if (!securityMonitoringService) {
    securityMonitoringService = new SecurityMonitoringService();
    logger.warn(
      "Security monitoring service created without proper initialization",
    );
  }
  return securityMonitoringService;
}

// Export security types and utilities
export {
  SecurityEventType,
  SecurityEventSeverity,
  SecurityMonitoringService,
} from "./monitoring";
