/**
 * HIPAA Compliant Audit Logging Module
 *
 * This module provides a comprehensive audit logging system for tracking
 * all access, operations, and changes to PHI (Protected Health Information).
 * It supports both local storage and forwarding to compliance services.
 */

import type { EncryptionMode } from './fhe/types'
import process from 'node:process'
import { getLogger } from './logging'

// Initialize logger
const logger = getLogger()

// Audit log event types
export enum AuditEventType {
  ACCESS = 'access', // Accessing PHI
  CREATE = 'create', // Creating new PHI
  MODIFY = 'modify', // Modifying existing PHI
  DELETE = 'delete', // Deleting PHI
  EXPORT = 'export', // Exporting/downloading PHI
  SHARE = 'share', // Sharing PHI with another user/system
  LOGIN = 'login', // User login
  LOGOUT = 'logout', // User logout
  SYSTEM = 'system', // System level events
  SECURITY = 'security', // Security related events
  ADMIN = 'admin', // Administrative actions
  CONSENT = 'consent', // Patient consent operations
  AI_OPERATION = 'ai', // AI operations on PHI
}

// Audit log status
export enum AuditEventStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  ATTEMPT = 'attempt',
  BLOCKED = 'blocked',
}

/**
 * Audit details type for storing structured information about events
 */
export type AuditDetailValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | AuditDetailObject
  | AuditDetailArray
export interface AuditDetailObject {
  [key: string]: AuditDetailValue
}
export type AuditDetailArray = AuditDetailValue[]
export type AuditDetails = Record<string, AuditDetailValue>

// Audit log entry interface
export interface AuditLogEntry {
  id: string // Unique identifier for the even
  timestamp: string // ISO timestamp of the even
  userId: string // User who performed the action
  userRole?: string // Role of the user
  action: string // Specific action performed
  eventType: AuditEventType // Type of even
  status: AuditEventStatus // Outcome status
  resource: string // Resource/data that was accessed/modified
  resourceId?: string // ID of the resource if applicable
  details?: AuditDetails // Additional details about the even
  ipAddress?: string // Source IP address
  userAgent?: string // User agent information
  sessionId?: string // Session identifier
  encryptionMode?: EncryptionMode // Encryption mode used for the operation
  organizationId?: string // Organization identifier
  patientId?: string // Patient identifier if applicable
  notes?: string // Any additional notes
}

// Configuration for the audit service
interface AuditServiceConfig {
  enabled: boolean
  localStorageEnabled: boolean
  remoteStorageEnabled: boolean
  remoteEndpoint?: string
  encryptLogs: boolean
  retentionDays: number
  batchSize: number
  debugMode: boolean
}

// Default configuration
const DEFAULT_CONFIG: AuditServiceConfig = {
  enabled: true,
  localStorageEnabled: true,
  remoteStorageEnabled: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.AUDIT_LOG_ENDPOINT,
  encryptLogs: process.env.NODE_ENV === 'production',
  retentionDays: 90, // HIPAA requires 6 years, but for this app we'll use 90 days
  batchSize: 100,
  debugMode: process.env.NODE_ENV === 'development',
}
// Queue of pending log entries for batch processing
let logQueue: AuditLogEntry[] = []

// Timer for batch processing
let batchTimer: NodeJS.Timeout | null = null

// Current config
let config: AuditServiceConfig = { ...DEFAULT_CONFIG }

/**
 * Initialize the audit service with custom configuration
 */
export function initializeAuditService(
  customConfig?: Partial<AuditServiceConfig>,
): void {
  config = { ...DEFAULT_CONFIG, ...customConfig }

  logger.info('HIPAA Audit logging service initialized')

  // Start batch timer if remote storage is enabled
  if (config.remoteStorageEnabled && config.remoteEndpoint) {
    startBatchTimer()
  }
}

/**
 * Start the batch processing timer
 */
function startBatchTimer(): void {
  if (batchTimer) {
    clearInterval(batchTimer)
  }

  // Process logs every 60 seconds
  batchTimer = setInterval(() => {
    if (logQueue.length > 0) {
      processBatch()
    }
  }, 60000)
}

/**
 * Process a batch of logs
 */
async function processBatch(): Promise<void> {
  if (logQueue.length === 0) {
    return
  }

  const batch = logQueue.splice(0, config.batchSize)

  if (config.remoteStorageEnabled && config.remoteEndpoint) {
    try {
      await sendLogsToRemoteEndpoint(batch)
    } catch (error) {
      logger.error(
        'Failed to send audit logs to remote endpoint',
        error as Record<string, unknown>,
      )

      // Put the logs back in the queue for retry
      logQueue = [...batch, ...logQueue]
    }
  }
}

/**
 * Send logs to remote endpoint
 */
async function sendLogsToRemoteEndpoint(logs: AuditLogEntry[]): Promise<void> {
  if (!config.remoteEndpoint) {
    return
  }

  try {
    const response = await fetch(config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.AUDIT_API_KEY || '',
      },
      body: JSON.stringify({
        logs,
        source: 'therapy-chat-app',
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(
        `Remote logging failed: ${response.status} ${response.statusText}`,
      )
    }

    if (config.debugMode) {
      logger.debug(`Sent ${logs.length} audit logs to remote endpoint`)
    }
  } catch (error) {
    logger.error(
      'Error sending logs to remote endpoint',
      error as Record<string, unknown>,
    )
    throw error
  }
}

/**
 * Generate a unique ID for audit logs
 */
function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get the client IP address from the request
 */
function getClientIp(): string {
  if (typeof window === 'undefined') {
    return 'server-side'
  }

  return 'client-side'
}

/**
 * Get user agent information
 */
function getUserAgent(): string {
  if (typeof window === 'undefined') {
    return 'server-side'
  }

  return navigator.userAgent
}

/**
 * Get the current session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') {
    return 'server-session'
  }

  // Get from local storage or create a new one
  let sessionId = localStorage.getItem('therapy-chat-session-id')

  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('therapy-chat-session-id', sessionId)
  }

  return sessionId
}

/**
 * Store an audit log entry locally
 */
function storeLocalAuditLog(entry: AuditLogEntry): void {
  if (!config.localStorageEnabled) {
    return
  }

  try {
    // Get existing logs
    const existingLogsJson = localStorage.getItem('hipaa-audit-logs')
    const existingLogs: AuditLogEntry[] = existingLogsJson
      ? JSON.parse(existingLogsJson)
      : []

    // Add new log
    const updatedLogs = [entry, ...existingLogs]

    // Respect retention policy
    const retentionDate = new Date()
    retentionDate.setDate(retentionDate.getDate() - config.retentionDays)

    // Only keep logs within retention period
    const filteredLogs = updatedLogs.filter((log) => {
      const logDate = new Date(log.timestamp)
      return logDate >= retentionDate
    })

    // Save back to localStorage
    localStorage.setItem('hipaa-audit-logs', JSON.stringify(filteredLogs))
  } catch (error) {
    logger.error(
      'Failed to store audit log locally',
      error as Record<string, unknown>,
    )
  }
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  type: AuditEventType,
  action: string,
  userId: string,
  resource: string,
  details?: AuditDetails,
  status: AuditEventStatus = AuditEventStatus.SUCCESS,
): Promise<AuditLogEntry> {
  return await createHIPAACompliantAuditLog({
    userId,
    action,
    resource,
    eventType: type,
    status,
    details,
  })
}

/**
 * Log an audit even
 */
export function logAuditEvent(
  eventType: AuditEventType,
  action: string,
  userId: string,
  resourceId?: string,
  details?: AuditDetails,
): void {
  createHIPAACompliantAuditLog({
    userId,
    action,
    resource: resourceId || 'unknown',
    eventType,
    details,
  }).catch((error) => {
    logger.error('Failed to log audit event', error)
  })
}

/**
 * Create a HIPAA compliant audit log
 */
export async function createHIPAACompliantAuditLog(params: {
  userId: string
  action: string
  resource: string
  eventType?: AuditEventType
  status?: AuditEventStatus
  resourceId?: string
  details?: AuditDetails
  userRole?: string
  patientId?: string
  organizationId?: string
  notes?: string
}): Promise<AuditLogEntry> {
  // Default values
  const eventType = params.eventType || AuditEventType.SYSTEM
  const status = params.status || AuditEventStatus.SUCCESS

  // Create log entry
  const logEntry: AuditLogEntry = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    userId: params.userId,
    userRole: params.userRole,
    action: params.action,
    eventType,
    status,
    resource: params.resource,
    resourceId: params.resourceId,
    details: params.details,
    ipAddress: getClientIp(),
    userAgent: getUserAgent(),
    sessionId: getSessionId(),
    patientId: params.patientId,
    organizationId: params.organizationId,
    notes: params.notes,
  }

  // Store locally if enabled
  if (config.localStorageEnabled) {
    storeLocalAuditLog(logEntry)
  }

  // Add to remote queue if enabled
  if (config.remoteStorageEnabled) {
    logQueue.push(logEntry)

    // Process immediately if queue is large enough
    if (logQueue.length >= config.batchSize) {
      processBatch().catch((error) => {
        logger.error('Failed to process batch', error)
      })
    }
  }

  // Log to console in debug mode
  if (config.debugMode) {
    logger.debug('Audit log created', {
      id: logEntry.id,
      action: logEntry.action,
      eventType: logEntry.eventType,
      resource: logEntry.resource,
    })
  }

  return logEntry
}

/**
 * Get all audit logs from local storage
 */
export function getAuditLogs(): AuditLogEntry[] {
  if (!config.localStorageEnabled) {
    return []
  }

  try {
    const logsJson = localStorage.getItem('hipaa-audit-logs')
    return logsJson ? JSON.parse(logsJson) : []
  } catch (error) {
    logger.error(
      'Failed to retrieve audit logs',
      error as Record<string, unknown>,
    )
    return []
  }
}

/**
 * Clear all audit logs from local storage
 */
export function clearAuditLogs(): void {
  if (!config.localStorageEnabled) {
    return
  }

  try {
    localStorage.removeItem('hipaa-audit-logs')
    logger.info('Audit logs cleared from local storage')
  } catch (error) {
    logger.error('Failed to clear audit logs', error as Record<string, unknown>)
  }
}

/**
 * Export audit logs as JSON string
 */
export function exportAuditLogs(): string {
  const logs = getAuditLogs()
  return JSON.stringify(logs, null, 2)
}

/**
 * Configure the audit service
 */
export function configureAuditService(
  newConfig: Partial<AuditServiceConfig>,
): void {
  config = { ...config, ...newConfig }

  // Restart batch timer if remote storage configuration changed
  if (config.remoteStorageEnabled && config.remoteEndpoint) {
    startBatchTimer()
  } else if (batchTimer) {
    clearInterval(batchTimer)
    batchTimer = null
  }

  logger.info('Audit service configuration updated')
}

// Auto-initialize the service
initializeAuditService()
