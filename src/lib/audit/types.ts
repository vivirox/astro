/**
 * Metadata for audit log entries
 */
export interface AuditMetadata {
  /** Reason for the audit event */
  reason?: string
  /** IP address of the request */
  ipAddress?: string
  /** User agent of the request */
  userAgent?: string
  /** Required role for access */
  requiredRole?: string
  /** User's actual role */
  userRole?: string
  /** HTTP method of the request */
  method?: string
  /** Request path */
  path?: string
  /** Session ID if applicable */
  sessionId?: string
  /** Any additional metadata */
  [key: string]: unknown
}

/**
 * Resource object for audit logs
 */
export interface AuditResource {
  /** Resource identifier */
  id: string
  /** Resource type */
  type: string
}

/**
 * Audit log entry in the database
 */
export interface DbAuditLog {
  id: string
  timestamp: Date
  action: string
  user_id: string
  resource_id: string
  resource_type: string
  metadata: AuditMetadata
}

/**
 * Audit log entry as returned by the API
 */
export interface AuditLogEntry {
  id: string
  timestamp: Date
  action: string
  userId: string
  resource: AuditResource
  metadata: AuditMetadata
}
