import { createAuditLog } from '../audit/log'
import { getLogger } from '../logging'
import { z } from 'zod'
import type { Database } from '../../types/supabase.js'

const logger = getLogger()

/**
 * Security event types
 */
export enum SecurityEventType {
  FAILED_LOGIN = 'failed_login',
  EXCESSIVE_REQUESTS = 'excessive_requests',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCESS_DENIED = 'access_denied',
  API_ABUSE = 'api_abuse',
  ACCOUNT_LOCKOUT = 'account_lockout',
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
  metadata?: Record<string, unknown>
  severity: SecurityEventSeverity
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
 * Security event validation schema
 */
const securityEventSchema = z.object({
  type: z.nativeEnum(SecurityEventType),
  userId: z.string().optional(),
  ip: z.string().ip().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  severity: z.nativeEnum(SecurityEventSeverity),
  timestamp: z.date(),
})

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
    new Map()
  private lockedAccounts: Map<string, Date> = new Map()
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
  public async trackSecurityEvent(
    event: Partial<SecurityEvent>
  ): Promise<void> {
    try {
      // Validate and normalize the event
      const validatedEventSchema = z.object({
        type: z.nativeEnum(SecurityEventType),
        userId: z.string().optional(),
        ip: z.string().optional(),
        userAgent: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
        severity: z
          .nativeEnum(SecurityEventSeverity)
          .default(SecurityEventSeverity.MEDIUM),
        timestamp: z.date().default(() => new Date()),
      })

      const validatedEvent = validatedEventSchema.parse(event) as SecurityEvent

      // Log to audit log
      await createAuditLog({
        userId: validatedEvent.userId || 'system',
        action: `security.${validatedEvent.type}`,
        resource: 'security',
        metadata: {
          severity: validatedEvent.severity,
          ip: validatedEvent.ip,
          metadata: validatedEvent.metadata,
        },
      })

      // Handle different event types
      switch (validatedEvent.type) {
        case SecurityEventType.FAILED_LOGIN:
          await this.handleFailedLogin(validatedEvent)
          break
        case SecurityEventType.EXCESSIVE_REQUESTS:
          await this.handleExcessiveRequests(validatedEvent)
          break
        case SecurityEventType.API_ABUSE:
          await this.handleApiAbuse(validatedEvent)
          break
      }

      // Trigger alerts for high severity events
      if (
        this.config.enableAlerts &&
        (validatedEvent.severity === SecurityEventSeverity.HIGH ||
          validatedEvent.severity === SecurityEventSeverity.CRITICAL)
      ) {
        await this.triggerAlert(validatedEvent)
      }

      if (this.config.debugMode) {
        console.debug(`[Security] Event tracked: ${validatedEvent.type}`)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new SecurityMonitoringError(
          `Invalid security event: ${error.message}`
        )
      }
      throw new SecurityMonitoringError(
        `Failed to track security event: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(event: SecurityEvent): Promise<void> {
    if (!event.userId) return

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
    event: SecurityEvent
  ): Promise<void> {
    const now = new Date()
    this.lockedAccounts.set(userId, now)

    try {
      // Create account lockout even
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
      })

      // Reset failed login counter
      this.failedLogins.delete(userId)

      // Log account lockou
      logger.warn(`Account locked: ${userId}`, {
        userId,
        duration: this.config.accountLockoutDuration,
        until: new Date(
          now.getTime() + this.config.accountLockoutDuration * 1000
        ),
      })
    } catch (error) {
      throw new DatabaseError(
        `Failed to update user lock status: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Check if an account is locked
   */
  public isAccountLocked(userId: string): boolean {
    const lockTime = this.lockedAccounts.get(userId)
    if (!lockTime) return false

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
  }

  /**
   * Handle API abuse
   */
  private async handleApiAbuse(event: SecurityEvent): Promise<void> {
    // Implementation for handling API abuse
    logger.warn('API abuse detected', { event })
  }

  /**
   * Trigger alert for high severity security events
   */
  private async triggerAlert(event: SecurityEvent): Promise<void> {
    logger.error(
      `SECURITY ALERT: ${event.type} (${event.severity}) - User: ${event.userId || 'unknown'}, IP: ${event.ip || 'unknown'}, Metadata: ${JSON.stringify(event.metadata)}`
    )
  }

  /**
   * Get security events for a user
   */
  public async getUserSecurityEvents(
    userId: string,
    limit: number = 100
  ): Promise<SecurityEvent[]> {
    const { supabase } = await import('../supabase')

    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(
        (row: Database['public']['Tables']['security_events']['Row']) => ({
          type: row.type as SecurityEventType,
          userId: row.user_id || undefined,
          ip: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
          metadata: row.metadata,
          severity: row.severity as SecurityEventSeverity,
          timestamp: new Date(row.created_at),
        })
      )
    } catch (error) {
      throw new DatabaseError(
        `Failed to get user security events: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Get security events by type
   */
  public async getSecurityEventsByType(
    type: SecurityEventType,
    limit: number = 100
  ): Promise<SecurityEvent[]> {
    const { supabase } = await import('../supabase')

    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(
        (row: Database['public']['Tables']['security_events']['Row']) => ({
          type: row.type as SecurityEventType,
          userId: row.user_id || undefined,
          ip: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
          metadata: row.metadata,
          severity: row.severity as SecurityEventSeverity,
          timestamp: new Date(row.created_at),
        })
      )
    } catch (error) {
      throw new DatabaseError(
        `Failed to get security events by type: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * Clean up stale records
   */
  private cleanupStaleRecords(): void {
    const now = new Date()
    const staleLoginThreshold = new Date(
      now.getTime() - this.config.failedLoginWindow
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
        lockTime.getTime() + this.config.accountLockoutDuration
      )
      if (now > lockExpiry) {
        this.lockedAccounts.delete(key)
      }
    }
  }
}
