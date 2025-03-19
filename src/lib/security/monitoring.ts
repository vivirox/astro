import { db } from "../db";
import { createAuditLog } from "../audit/log";
import { getLogger } from "../logging";

const logger = getLogger();

/**
 * Security event types
 */
export enum SecurityEventType {
  FAILED_LOGIN = "failed_login",
  EXCESSIVE_REQUESTS = "excessive_requests",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  ACCESS_DENIED = "access_denied",
  API_ABUSE = "api_abuse",
  ACCOUNT_LOCKOUT = "account_lockout",
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity: SecurityEventSeverity;
  timestamp: Date;
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitoringConfig {
  // Maximum failed login attempts before lockout
  maxFailedLoginAttempts: number;

  // Time window in seconds for failed login attempts
  failedLoginWindow: number;

  // Account lockout duration in seconds
  accountLockoutDuration: number;

  // Max requests per minute to consider as API abuse
  apiAbuseThreshold: number;

  // Enable alerts for high severity events
  enableAlerts: boolean;
}

/**
 * Default security monitoring configuration
 */
const defaultConfig: SecurityMonitoringConfig = {
  maxFailedLoginAttempts: 5,
  failedLoginWindow: 300, // 5 minutes
  accountLockoutDuration: 1800, // 30 minutes
  apiAbuseThreshold: 100, // 100 requests per minute
  enableAlerts: true,
};

/**
 * Security monitoring service
 */
export class SecurityMonitoringService {
  private config: SecurityMonitoringConfig;
  private failedLogins: Map<string, { count: number; firstAttempt: Date }> =
    new Map();
  private lockedAccounts: Map<string, Date> = new Map();

  constructor(config: Partial<SecurityMonitoringConfig> = {}) {
    this.config = { ...defaultConfig, ...config };

    // Set up cleanup interval
    setInterval(() => this.cleanupStaleRecords(), 60000); // Run every minute
  }

  /**
   * Track a security event
   * @param event The security event to track
   */
  async trackSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store in database
      await db.query(
        `
        INSERT INTO security_events (
          type, 
          user_id, 
          ip_address, 
          user_agent, 
          metadata, 
          severity, 
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          event.type,
          event.userId || null,
          event.ip || null,
          event.userAgent || null,
          event.metadata || {},
          event.severity,
          event.timestamp,
        ],
      );

      // Log to audit log
      await createAuditLog({
        userId: event.userId || "system",
        action: `security.${event.type}`,
        resource: "security",
        metadata: {
          severity: event.severity,
          ip: event.ip,
          metadata: event.metadata,
        },
      });

      // Log security event
      logger.warn(`Security event: ${event.type} (${event.severity})`, {
        securityEvent: {
          type: event.type,
          userId: event.userId,
          ip: event.ip,
          severity: event.severity,
          metadata: event.metadata,
        },
      });

      // Process event based on type
      switch (event.type) {
        case SecurityEventType.FAILED_LOGIN:
          await this.handleFailedLogin(event);
          break;
        case SecurityEventType.EXCESSIVE_REQUESTS:
          await this.handleExcessiveRequests(event);
          break;
        case SecurityEventType.API_ABUSE:
          await this.handleApiAbuse(event);
          break;
      }

      // Trigger alerts for high severity events
      if (
        this.config.enableAlerts &&
        (event.severity === SecurityEventSeverity.HIGH ||
          event.severity === SecurityEventSeverity.CRITICAL)
      ) {
        await this.triggerAlert(event);
      }
    } catch (error) {
      logger.error("Failed to track security event", error);
    }
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(event: SecurityEvent): Promise<void> {
    if (!event.userId) return;

    const key = event.userId;
    const now = new Date();

    // Check if the account is already locked
    if (this.isAccountLocked(key)) {
      return;
    }

    // Get or create failed login record
    if (!this.failedLogins.has(key)) {
      this.failedLogins.set(key, { count: 1, firstAttempt: now });
      return;
    }

    // Update failed login record
    const record = this.failedLogins.get(key)!;
    record.count += 1;

    // Check if we should reset the count due to time window
    const timeSinceFirst =
      (now.getTime() - record.firstAttempt.getTime()) / 1000;
    if (timeSinceFirst > this.config.failedLoginWindow) {
      this.failedLogins.set(key, { count: 1, firstAttempt: now });
      return;
    }

    // Check if we should lock the account
    if (record.count >= this.config.maxFailedLoginAttempts) {
      await this.lockAccount(key, event);
    }
  }

  /**
   * Lock an account
   */
  private async lockAccount(
    userId: string,
    event: SecurityEvent,
  ): Promise<void> {
    const now = new Date();
    this.lockedAccounts.set(userId, now);

    // Create account lockout event
    await this.trackSecurityEvent({
      type: SecurityEventType.ACCOUNT_LOCKOUT,
      userId,
      ip: event.ip,
      userAgent: event.userAgent,
      metadata: {
        failedAttempts: this.failedLogins.get(userId)?.count,
        lockoutDuration: this.config.accountLockoutDuration,
      },
      severity: SecurityEventSeverity.HIGH,
      timestamp: now,
    });

    // Reset failed login counter
    this.failedLogins.delete(userId);

    // Update user status in database
    try {
      await db.query(
        `
        UPDATE users 
        SET locked_until = $1, 
            security_status = 'locked' 
        WHERE id = $2
      `,
        [
          new Date(now.getTime() + this.config.accountLockoutDuration * 1000),
          userId,
        ],
      );
    } catch (error) {
      logger.error("Failed to update user lock status in database", error);
    }
  }

  /**
   * Check if an account is locked
   */
  isAccountLocked(userId: string): boolean {
    const lockTime = this.lockedAccounts.get(userId);
    if (!lockTime) return false;

    const now = new Date();
    const elapsedSeconds = (now.getTime() - lockTime.getTime()) / 1000;

    // If lock duration has passed, unlock the account
    if (elapsedSeconds >= this.config.accountLockoutDuration) {
      this.lockedAccounts.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Handle excessive requests
   */
  private async handleExcessiveRequests(event: SecurityEvent): Promise<void> {
    // Implement specific logic for handling excessive requests
    // This might include temporary IP blocks, rate limit increases, etc.
  }

  /**
   * Handle API abuse
   */
  private async handleApiAbuse(event: SecurityEvent): Promise<void> {
    // Implement specific logic for handling API abuse
    // This might include blocking certain endpoints, requiring additional verification, etc.
  }

  /**
   * Trigger alert for high severity security events
   */
  private async triggerAlert(event: SecurityEvent): Promise<void> {
    // Log critical alert
    logger.error(`SECURITY ALERT: ${event.type} (${event.severity})`, {
      alert: {
        type: event.type,
        userId: event.userId,
        ip: event.ip,
        severity: event.severity,
        metadata: event.metadata,
        timestamp: event.timestamp,
      },
    });

    // In a real implementation, this could:
    // 1. Send an alert to a security team via email/SMS
    // 2. Create a ticket in an incident management system
    // 3. Trigger automated response (IP block, account lock, etc.)
  }

  /**
   * Get security events for a user
   */
  async getUserSecurityEvents(
    userId: string,
    limit: number = 100,
  ): Promise<SecurityEvent[]> {
    try {
      const result = await db.query(
        `
        SELECT * FROM security_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
        [userId, limit],
      );

      return result.rows.map((row) => ({
        type: row.type,
        userId: row.user_id,
        ip: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata,
        severity: row.severity,
        timestamp: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error("Failed to get user security events", error);
      return [];
    }
  }

  /**
   * Get security events by type
   */
  async getSecurityEventsByType(
    type: SecurityEventType,
    limit: number = 100,
  ): Promise<SecurityEvent[]> {
    try {
      const result = await db.query(
        `
        SELECT * FROM security_events
        WHERE type = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
        [type, limit],
      );

      return result.rows.map((row) => ({
        type: row.type,
        userId: row.user_id,
        ip: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata,
        severity: row.severity,
        timestamp: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error("Failed to get security events by type", error);
      return [];
    }
  }

  /**
   * Clean up stale records
   */
  private cleanupStaleRecords(): void {
    const now = new Date();

    // Clean up failed logins
    for (const [key, record] of this.failedLogins.entries()) {
      const elapsedSeconds =
        (now.getTime() - record.firstAttempt.getTime()) / 1000;
      if (elapsedSeconds > this.config.failedLoginWindow) {
        this.failedLogins.delete(key);
      }
    }

    // Clean up locked accounts
    for (const [key, lockTime] of this.lockedAccounts.entries()) {
      const elapsedSeconds = (now.getTime() - lockTime.getTime()) / 1000;
      if (elapsedSeconds >= this.config.accountLockoutDuration) {
        this.lockedAccounts.delete(key);
      }
    }
  }
}
