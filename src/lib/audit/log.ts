import { createClient } from '@supabase/supabase-js';

// Define audit log entry type
export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Create an audit log entry
 * @param entry The audit log entry to create
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Add timestamp if not provided
    const timestamp = entry.timestamp || new Date();

    // Insert the audit log entry
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.userId,
        action: entry.action,
        resource: entry.resource,
        metadata: entry.metadata || {},
        created_at: timestamp.toISOString()
      });

    if (error) {
      console.error('Error creating audit log:', error);
    }
  } catch (error) {
    console.error('Error creating audit log:', error);
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
    );

    // Get the audit logs
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }

    // Transform the data to match our interface
    return data.map(log => ({
      userId: log.user_id,
      action: log.action,
      resource: log.resource,
      metadata: log.metadata,
      timestamp: new Date(log.created_at)
    }));
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
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
    );

    // Get the audit logs
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', action)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }

    // Transform the data to match our interface
    return data.map(log => ({
      userId: log.user_id,
      action: log.action,
      resource: log.resource,
      metadata: log.metadata,
      timestamp: new Date(log.created_at)
    }));
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
} 