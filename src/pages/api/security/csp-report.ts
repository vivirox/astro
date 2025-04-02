import type { APIRoute } from 'astro'
import { createAuditLog } from '@/lib/audit/log'
import { getLogger } from '@/lib/logging'

const logger = getLogger()

/**
 * API endpoint for CSP violation reports
 * This receives and processes Content-Security-Policy violation reports
 * sent by browsers
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse CSP violation report
    const report = await request.json()
    
    // Extract client information
    const clientIp = 
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Log the CSP violation for security monitoring
    logger.warn('CSP violation detected', {
      clientIp,
      userAgent,
      report: JSON.stringify(report)
    })
    
    // Create audit log entry for the CSP violation
    await createAuditLog({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userId: 'system',
      action: 'security.csp_violation',
      resource: { id: 'csp', type: 'security' },
      metadata: {
        clientIp,
        userAgent,
        violatedDirective: report['csp-report']?.['violated-directive'] || 'unknown',
        blockedUri: report['csp-report']?.['blocked-uri'] || 'unknown',
        documentUri: report['csp-report']?.['document-uri'] || 'unknown',
        originalPolicy: report['csp-report']?.['original-policy'] || 'unknown',
        timestamp: new Date().toISOString(),
        severity: 'medium'
      }
    })
    
    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 204,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    // Handle parsing errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    logger.error('Error processing CSP report', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return new Response(JSON.stringify({ error: 'Invalid CSP report format' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  }
}
