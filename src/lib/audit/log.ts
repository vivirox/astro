/**
 * Audit logging system
 * Provides HIPAA-compliant audit logging
 */

import { createClient } from '@supabase/supabase-js'

// Define structured metadata types to replace 'any'
export type AuditMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [key: string]: AuditMetadataValue }
  | AuditMetadataValue[]

export type AuditMetadata = Record<string, AuditMetadataValue>

// Define type for the database log record
interface DbAuditLog {
  user_id: string
  action: string
  resource: string
  resource_id?: string
  metadata: AuditMetadata
  created_at: string | number | Date
}

// Define audit log entry type
export interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: AuditMetadata
  timestamp?: Date
}

/**
 * Create an audit log entry - function overloads
 * Function overload signatures
 */
export function createAuditLog(entry: AuditLogEntry): Promise<void>
export function createAuditLog(
  userId: string,
  action: string,
  resource: string,
  metadata?: AuditMetadata,
  request?: { headers: { get(name: string): string | null } }
): Promise<void>

/**
 * Create an audit log entry - implementation
 */
export async function createAuditLog(
  entryOrUserId: AuditLogEntry | string,
  action?: string,
  resource?: string,
  metadata: AuditMetadata = {},
  request?: { headers: { get(name: string): string | null } }
): Promise<void> {
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    )

    // Add timestamp
    const timestamp = new Date()

    // Extract IP and user agent if request is provided
    let ip_address = null
    let user_agent = null
    if (request) {
      ip_address =
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip')
      user_agent = request.headers.get('user-agent')
    }

    // Handle both function signatures
    if (typeof entryOrUserId === 'string') {
      // Called with individual parameters
      const userId = entryOrUserId

      // Insert the audit log entry
      const { error } = await supabase.from('audit_logs').insert({
        user_id: userId,
        action: action,
        resource: resource,
        metadata: metadata,
        created_at: timestamp.toISOString(),
        ip_address,
        user_agent,
      })

      if (error) {
        console.error('Error creating audit log:', error)
      }
    } else {
      // Called with entry object
      const entry = entryOrUserId

      // Insert the audit log entry
      const { error } = await supabase.from('audit_logs').insert(entry)

      if (error) {
        console.error('Error creating audit log:', error)
      }
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}

/**
 * Get audit logs for a user
 * @param userId The user ID to get logs for
 * @param limit The maximum number of logs to return
 * @param offset The offset for pagination
 * @returns The audit logs
 */
export async function getUserAuditLogs(
  userId: string,
  limit = 100,
  offset = 0
): Promise<AuditLogEntry[]> {
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    )

    // Get the audit logs
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting audit logs:', error)
      return []
    }

    // Transform the data to match our interface
    return data?.map((log: DbAuditLog) => ({
      userId: log.user_id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resource_id,
      metadata: log.metadata,
      timestamp: new Date(log.created_at),
    }))
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return []
  }
}

/**
 * Get audit logs for a specific action
 * @param action The action to get logs for
 * @param limit The maximum number of logs to return
 * @param offset The offset for pagination
 * @returns The audit logs
 */
export async function getActionAuditLogs(
  action: string,
  limit = 100,
  offset = 0
): Promise<AuditLogEntry[]> {
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    )

    // Get the audit logs
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting audit logs:', error)
      return []
    }

    // Transform the data to match our interface
    return data?.map((log: DbAuditLog) => ({
      userId: log.user_id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resource_id,
      metadata: log.metadata,
      timestamp: new Date(log.created_at),
    }))
  } catch (error) {
    console.error('Error getting audit logs:', error)
    return []
  }
}
