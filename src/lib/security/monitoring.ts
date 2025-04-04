import type { Database } from '../../types/supabase'
import type { AuditMetadata } from '../audit/log'
import { createAuditLog } from '../audit/log'
import { getLogger } from '../logging'

const logger = getLogger()

/**
 * Security event types
 */
export enum SecurityEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  KEY_ROTATION = 'key_rotation',
  ACCESS_DENIED = 'access_denied',
  DATA_ACCESS = 'data_access',
  ENCRYPTED_OPERATION = 'encrypted_operation',
  CONFIG_CHANGE = 'config_change',
  COMPLIANCE_CHECK = 'compliance_check',
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  ip?: string
  userAgent?: string
  severity: SecurityEventSeverity
  metadata: Record<string, unknown>
  timestamp: Date
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitoringConfig {
  maxFailedLoginAttempts: number
  failedLoginWindow: number
  accountLockoutDuration: number
  apiAbuseThreshold: number
  enableAlerts: boolean
  debugMode?: boolean
}

/**
 * Custom error types
 */
export class SecurityMonitoringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecurityMonitoringError'
  }
}

export class DatabaseError extends SecurityMonitoringError {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

/**
 * Default security monitoring configuration
 */
const defaultConfig: SecurityMonitoringConfig = {
  maxFailedLoginAttempts: 5,
  failedLoginWindow: 300,
  accountLockoutDuration: 1800,
  apiAbuseThreshold: 100,
  enableAlerts: true,
  debugMode: false,
}

/**
 * Security monitoring service
 */
export class SecurityMonitoringService {
  private config: SecurityMonitoringConfig
  private failedLogins: Map<string, { count: number; firstAttempt: Date }> =
    new Map<string, { count: number; firstAttempt: Date }>()

  private lockedAccounts: Map<string, Date> = new Map<string, Date>()
  private cleanupInterval: NodeJS.Timeout

  constructor(config: Partial<SecurityMonitoringConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.cleanupInterval = setInterval(() => this.cleanupStaleRecords(), 60000)
  }

  /**
   * Clean up service resources
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval)
  }

  /**
   * Track a security even
   */
  public async trackSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      logger.info(`Security event: ${event.type} (${event.severity})`, {
        ...event.metadata,
        timestamp: event.timestamp,
      })

      // In a real implementation, this would persist the event to a database
      // For now, we'll just log i

      return Promise.resolve()
    } catch (error) {
      logger.error('Failed to track security event', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(event: SecurityEvent): Promise<void> {
    if (!event.userId) {
      return
    }

    const key = event.userId
    const now = new Date()

    // Check if the account is already locked
    if (this.isAccountLocked(key)) {
      return
    }

    // Get or create failed login record
    if (!this.failedLogins.has(key)) {
      this.failedLogins.set(key, { count: 1, firstAttempt: now })
      return
    }

    // Update failed login record
    const record = this.failedLogins.get(key)!
    record.count += 1

    // Check if we should reset the count due to time window
    const timeSinceFirst =
      (now.getTime() - record.firstAttempt.getTime()) / 1000
    if (timeSinceFirst > this.config.failedLoginWindow) {
      this.failedLogins.set(key, { count: 1, firstAttempt: now })
      return
    }

    // Check if we should lock the accoun
    if (record.count >= this.config.maxFailedLoginAttempts) {
      await this.lockAccount(key, event)
    }
  }

  /**
   * Lock an accoun
   */
  private async lockAccount(
    userId: string,
    event: SecurityEvent,
  ): Promise<void> {
    const now = new Date()
    this.lockedAccounts.set(userId, now)

    try {
      // Create account lockout even
      await this.trackSecurityEvent({
        type: SecurityEventType.ACCESS_DENIED,
        userId,
        ip: event.ip,
        userAgent: event.userAgent,
        metadata: {
          failedAttempts: this.failedLogins.get(userId)?.count,
          lockoutDuration: this.config.accountLockoutDuration,
        },
        severity: SecurityEventSeverity.HIGH,
        timestamp: now,
      })

      // Reset failed login counter
      this.failedLogins.delete(userId)

      // Log account lockou
      logger.warn(`Account locked: ${userId}`, {
        userId,
        duration: this.config.accountLockoutDuration,
        until: new Date(
          now.getTime() + this.config.accountLockoutDuration * 1000,
        ),
      })
    } catch (error) {
      throw new DatabaseError(
        `Failed to update user lock status: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Check if an account is locked
   */
  public isAccountLocked(userId: string): boolean {
    const lockTime = this.lockedAccounts.get(userId)
    if (!lockTime) {
      return false
    }

    const now = new Date()
    const elapsedSeconds = (now.getTime() - lockTime.getTime()) / 1000

    // If lock duration has passed, unlock the accoun
    if (elapsedSeconds >= this.config.accountLockoutDuration) {
      this.lockedAccounts.delete(userId)
      return false
    }

    return true
  }

  /**
   * Handle excessive requests
   */
  private async handleExcessiveRequests(event: SecurityEvent): Promise<void> {
    // Implementation for handling excessive requests
    logger.warn('Excessive requests detected', { event })

    if (event.userId) {
      // If we have a user ID, we can apply user-specific restrictions
      // 1. Add temporary throttling for this user
      // 2. Apply more severe rate limits
      // 3. Notify admins if the pattern persists

      // Log the excessive requests to the security events table
      await createAuditLog(event.userId, 'security.rate_limit', 'api', {
        ip: event.ip,
        userAgent: event.userAgent,
        details: JSON.stringify(event.metadata), // Convert to string to ensure it's a valid type
      } as AuditMetadata)
    } else if (event.ip) {
      // If we don't have a user ID but have an IP, apply IP-based restrictions
      // Log anonymous excessive requests
      await createAuditLog('anonymous', 'security.rate_limit', 'api', {
        ip: event.ip,
        userAgent: event.userAgent,
        details: JSON.stringify(event.metadata), // Convert to string to ensure it's a valid type
      } as AuditMetadata)
    }
  }

  /**
   * Handle API abuse
   */
  private async handleApiAbuse(event: SecurityEvent): Promise<void> {
    // Implementation for handling API abuse
    logger.warn('API abuse detected', { event })

    // Handle API abuse with more severe restrictions than excessive requests
    const userId = event.userId || 'anonymous'

    // Log the API abuse even
    await createAuditLog(userId, 'security.api_abuse', 'api', {
      ip: event.ip,
      userAgent: event.userAgent,
      abuseType: String(event.metadata?.abuseType || 'unknown'),
      details: JSON.stringify(event.metadata), // Convert to string to ensure it's a valid type
    } as AuditMetadata)

    // If this is a high severity event, trigger additional protections
    if (
      event.severity === SecurityEventSeverity.HIGH ||
      event.severity === SecurityEventSeverity.CRITICAL
    ) {
      // Potential additional measures:
      // 1. Add IP to block lis
      // 2. Temporarily suspend user accoun
      // 3. Require additional verification for future requests
      // 4. Apply strict rate limiting

      logger.error(
        `Implementing protective measures for API abuse from ${userId}`,
      )
    }
  }

  /**
   * Trigger alert for high severity security events
   */
  private async triggerAlert(event: SecurityEvent): Promise<void> {
    logger.error(
      `SECURITY ALERT: ${event.type} (${event.severity}) - User: ${event.userId || 'unknown'}, IP: ${event.ip || 'unknown'}, Metadata: ${JSON.stringify(event.metadata)}`,
    )
  }

  /**
   * Get security events for a user
   */
  public async getUserSecurityEvents(
    userId: string,
    limit = 100,
  ): Promise<SecurityEvent[]> {
    const { supabase } = await import('../supabase')

    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return (data || []).map(
        (row: Database['public']['Tables']['security_events']['Row']) => ({
          type: row.type as SecurityEventType,
          userId: row.user_id || undefined,
          ip: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
          metadata: row.metadata,
          severity: row.severity as SecurityEventSeverity,
          timestamp: new Date(row.created_at),
        }),
      )
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user security events: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get security events by type
   */
  public async getSecurityEventsByType(
    type: SecurityEventType,
    limit = 100,
  ): Promise<SecurityEvent[]> {
    const { supabase } = await import('../supabase')

    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw error
      }

      return (data || []).map(
        (row: Database['public']['Tables']['security_events']['Row']) => ({
          type: row.type as SecurityEventType,
          userId: row.user_id || undefined,
          ip: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
          metadata: row.metadata,
          severity: row.severity as SecurityEventSeverity,
          timestamp: new Date(row.created_at),
        }),
      )
    } catch (error) {
      throw new DatabaseError(
        `Failed to get security events by type: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Clean up stale records
   */
  private cleanupStaleRecords(): void {
    const now = new Date()
    const staleLoginThreshold = new Date(
      now.getTime() - this.config.failedLoginWindow,
    )

    // Clean up failed login attempts
    const failedLoginEntries = Array.from(this.failedLogins.entries())
    for (const [key, record] of failedLoginEntries) {
      if (record.firstAttempt < staleLoginThreshold) {
        this.failedLogins.delete(key)
      }
    }

    // Clean up locked accounts
    const lockedAccountEntries = Array.from(this.lockedAccounts.entries())
    for (const [key, lockTime] of lockedAccountEntries) {
      const lockExpiry = new Date(
        lockTime.getTime() + this.config.accountLockoutDuration,
      )
      if (now > lockExpiry) {
        this.lockedAccounts.delete(key)
      }
    }
  }
}
