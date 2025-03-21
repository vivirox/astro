import { getLogger } from '../../../lib/logging'
import {
  SecurityEventType,
  SecurityEventSeverity,
} from '../../../lib/security/monitoring.js'
import { getCurrentUser } from '../../../lib/auth.js'
import { supabase } from '../../../lib/supabase.js'
import type { AstroCookies } from 'astro'

const logger = getLogger()

interface RequestContext {
  request: Request
  cookies: AstroCookies
}

export async function GET({ request, cookies }: RequestContext) {
  try {
    // Get current user session
    const user = await getCurrentUser(cookies)

    // Only allow admin users to access security events
    if (!user || user.role !== 'admin') {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized access',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const type = url.searchParams.get('type')
    const severity = url.searchParams.get('severity')
    const timeRange = url.searchParams.get('timeRange')
    const limit = parseInt(url.searchParams.get('limit') || '100', 10)
    const page = parseInt(url.searchParams.get('page') || '1', 10)

    // Start building the query
    let query = supabase.from('security_events').select('*')

    // Filter by type
    if (
      type &&
      type !== 'all' &&
      Object.values(SecurityEventType).includes(type as SecurityEventType)
    ) {
      query = query.eq('type', type)
    }

    // Filter by severity
    if (
      severity &&
      severity !== 'all' &&
      Object.values(SecurityEventSeverity).includes(
        severity as SecurityEventSeverity
      )
    ) {
      query = query.eq('severity', severity)
    }

    // Filter by time range
    let startDate: Date | undefined
    if (timeRange && timeRange !== 'all') {
      startDate = new Date()
      const now = new Date()

      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    // Add order by and pagination
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Execute the query
    const { data: result, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // Transform results to match the SecurityEvent interface
    const events = (result || []).map((row: any) => ({
      type: row.type as SecurityEventType,
      userId: row.user_id,
      ip: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      severity: row.severity as SecurityEventSeverity,
      timestamp: row.created_at,
    }))

    // Log the API request
    logger.info('Security events fetched', {
      userId: user.id,
      filters: { type, severity, timeRange },
      resultCount: events.length,
    })

    // Return the events
    return new Response(JSON.stringify(events), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    // Log error
    logger.error(
      'Error fetching security events',
      error instanceof Error ? error : new Error(String(error))
    )

    // Return error response
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch security events',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
