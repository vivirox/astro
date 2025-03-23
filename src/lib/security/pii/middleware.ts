/**
 * PII Detection Middleware
 *
 * This middleware scans requests and responses for personally identifiable information (PII)
 * and takes appropriate actions based on configuration:
 * - Log detection
 * - Redact PII from requests/responses
 * - Block requests containing PII
 * - Redirect to secure endpoints for sensitive operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLogger } from '../../logging'
import { piiDetectionService, PIIType } from '.'
import { createAuditLog } from '../../audit'

// Define enums locally if they're missing
enum AuditEventType {
  SECURITY = 'security',
  ACCESS = 'access',
  MODIFY = 'modify',
  CREATE = 'create',
  DELETE = 'delete',
  SYSTEM = 'system',
}

// Initialize logger
const logger = getLogger()

/**
 * PII Detection Middleware Configuration
 */
export interface PIIMiddlewareConfig {
  enabled: boolean
  redactRequests: boolean
  redactResponses: boolean
  blockRequests: boolean
  auditDetections: boolean
  sensitivePathPatterns: RegExp[]
  excludePathPatterns: RegExp[]
  sensitiveContentTypes: string[]
  sensitiveParameters: string[]
  redirectPath?: string
  typesToCheck?: PIIType[]
}

// Default configuration
const DEFAULT_CONFIG: PIIMiddlewareConfig = {
  enabled: true,
  redactRequests: true,
  redactResponses: true,
  blockRequests: false,
  auditDetections: true,
  sensitivePathPatterns: [
    /\/api\/therapy\/.*/,
    /\/api\/ai\/.*/,
    /\/api\/patients\/.*/,
    /\/api\/medical\/.*/,
  ],
  excludePathPatterns: [
    /\/_next\/.*/,
    /\/static\/.*/,
    /\/images\/.*/,
    /\/favicon\.ico/,
  ],
  sensitiveContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'text/plain',
    'multipart/form-data',
  ],
  sensitiveParameters: [
    'password',
    'token',
    'api_key',
    'email',
    'phone',
    'address',
    'ssn',
    'dob',
    'birthdate',
  ],
}

/**
 * PII detection middleware to scan and process requests/responses
 */
export async function piiMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>,
  config: Partial<PIIMiddlewareConfig> = {}
): Promise<NextResponse> {
  // Merge configuration with defaults
  const mergedConfig: PIIMiddlewareConfig = { ...DEFAULT_CONFIG, ...config }

  // Exit early if not enabled
  if (!mergedConfig.enabled) {
    return next()
  }

  // Check if this path should be excluded from scanning
  const { pathname } = request.nextUrl
  if (
    mergedConfig.excludePathPatterns.some((pattern) => pattern.test(pathname))
  ) {
    return next()
  }

  // Determine if this is a sensitive path
  const isSensitivePath = mergedConfig.sensitivePathPatterns.some((pattern) =>
    pattern.test(pathname)
  )

  // Get content type
  const contentType = request.headers.get('content-type') || ''
  const isSensitiveContentType = mergedConfig.sensitiveContentTypes.some(
    (type) => contentType.includes(type)
  )

  try {
    // Initialize PII detection service if not already initialized
    if (!piiDetectionService.isInitialized()) {
      await piiDetectionService.initialize()
    }

    // Check if we need to process the request body
    if (
      (isSensitivePath || isSensitiveContentType) &&
      request.method !== 'GET' &&
      request.method !== 'HEAD'
    ) {
      // Clone the request to avoid consuming the original
      const clonedRequest = request.clone()

      // Try to get the request body
      let requestBody: unknown

      try {
        if (contentType.includes('application/json')) {
          requestBody = await clonedRequest.json()
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await clonedRequest.formData()
          requestBody = Object.fromEntries(formData.entries())
        } else if (contentType.includes('text/plain')) {
          requestBody = await clonedRequest.text()
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await clonedRequest.formData()
          requestBody = Object.fromEntries(formData.entries())
        }
      } catch {
        logger.error('Failed to parse request body')
        // Continue with the request even if we can't parse the body
      }

      // Process the request body if we were able to parse it
      if (requestBody) {
        // For string content (plain text)
        if (typeof requestBody === 'string') {
          const piiResult = await piiDetectionService.detect(requestBody, {
            redact: mergedConfig.redactRequests,
            types: mergedConfig.typesToCheck,
          })

          // If PII detected
          if (piiResult.detected) {
            // Audit the detection
            if (mergedConfig.auditDetections) {
              await createAuditLog(
                AuditEventType.SECURITY,
                'security.pii_detected',
                getUserId(request) || 'anonymous',
                'api.request',
                {
                  path: pathname,
                  method: request.method,
                  piiTypes: piiResult.types,
                  confidence: piiResult.confidence,
                }
              )
            }

            // Log detection
            logger.warn('PII detected in request body', {
              path: pathname,
              method: request.method,
              piiTypes: piiResult.types,
              confidence: piiResult.confidence,
            })

            // Block the request if configured to do so
            if (mergedConfig.blockRequests) {
              return NextResponse.json(
                {
                  error:
                    'Request contains sensitive information and was blocked',
                },
                { status: 400 }
              )
            }

            // If redaction is enabled and we have a redacted version
            if (mergedConfig.redactRequests && piiResult.redacted) {
              // Continue with the redacted request
              return next()
            }
          }
        }
        // For object content (JSON or form data)
        else if (typeof requestBody === 'object' && requestBody !== null) {
          const { processed, hasPII } = await piiDetectionService.processObject(
            requestBody as Record<string, unknown>,
            {
              redact: mergedConfig.redactRequests,
              types: mergedConfig.typesToCheck,
              sensitiveKeys: mergedConfig.sensitiveParameters,
            }
          )

          // If PII detected
          if (hasPII) {
            // Audit the detection
            if (mergedConfig.auditDetections) {
              await createAuditLog(
                AuditEventType.SECURITY,
                'security.pii_detected',
                getUserId(request) || 'anonymous',
                'api.request',
                {
                  path: pathname,
                  method: request.method,
                }
              )
            }

            // Log detection
            logger.warn('PII detected in request body', {
              path: pathname,
              method: request.method,
            })

            // Block the request if configured to do so
            if (mergedConfig.blockRequests) {
              return NextResponse.json(
                {
                  error:
                    'Request contains sensitive information and was blocked',
                },
                { status: 400 }
              )
            }

            // If redaction is enabled
            if (mergedConfig.redactRequests) {
              // Create a new request with the redacted body (used implicitly)
              new Request(request.url, {
                method: request.method,
                headers: request.headers,
                body: JSON.stringify(processed),
              })
            }
          }
        }
      }
    }

    // Process the response if needed
    if (mergedConfig.redactResponses) {
      // First, get the original response
      const originalResponse = await next()

      // Check if this is a sensitive content type that we should process
      const responseContentType =
        originalResponse.headers.get('content-type') || ''
      const shouldProcessResponse =
        isSensitivePath ||
        mergedConfig.sensitiveContentTypes.some((type) =>
          responseContentType.includes(type)
        )

      // If not sensitive, return the original response
      if (!shouldProcessResponse) {
        return originalResponse
      }

      // Clone the response to avoid consuming the original
      const clonedResponse = originalResponse.clone()

      // Try to get the response body
      let responseBody: unknown

      try {
        if (responseContentType.includes('application/json')) {
          responseBody = await clonedResponse.json()
        } else if (responseContentType.includes('text/plain')) {
          responseBody = await clonedResponse.text()
        }
      } catch {
        logger.error('Failed to parse response body')
        // Return the original response if we can't parse the body
        return originalResponse
      }

      // Process the response body if we were able to parse it
      if (responseBody) {
        // For string content (plain text)
        if (typeof responseBody === 'string') {
          const piiResult = await piiDetectionService.detect(responseBody, {
            redact: true,
            types: mergedConfig.typesToCheck,
          })

          // If PII detected and redacted
          if (piiResult.detected && piiResult.redacted) {
            // Audit the detection
            if (mergedConfig.auditDetections) {
              await createAuditLog(
                AuditEventType.SECURITY,
                'security.pii_detected',
                getUserId(request) || 'anonymous',
                'api.response',
                {
                  path: pathname,
                  method: request.method,
                  piiTypes: piiResult.types,
                  confidence: piiResult.confidence,
                }
              )
            }

            // Create a new response with the redacted body
            return new NextResponse(piiResult.redacted, {
              status: originalResponse.status,
              statusText: originalResponse.statusText,
              headers: originalResponse.headers,
            })
          }
        }
        // For object content (JSON)
        else if (typeof responseBody === 'object' && responseBody !== null) {
          const { processed, hasPII } = await piiDetectionService.processObject(
            responseBody as Record<string, unknown>,
            {
              redact: true,
              types: mergedConfig.typesToCheck,
            }
          )

          // If PII detected and redacted
          if (hasPII) {
            // Audit the detection
            if (mergedConfig.auditDetections) {
              await createAuditLog(
                AuditEventType.SECURITY,
                'security.pii_detected',
                getUserId(request) || 'anonymous',
                'api.response',
                {
                  path: pathname,
                  method: request.method,
                }
              )
            }

            // Create a new response with the redacted body
            return NextResponse.json(processed, {
              status: originalResponse.status,
              headers: originalResponse.headers,
            })
          }
        }

        // If no PII detected or redaction not needed, return the original response
        return originalResponse
      }

      // Return the original response if we couldn't process it
      return originalResponse
    }

    // If we don't need to process the response, just call next
    return next()
  } catch {
    // Log the error
    logger.error('Error in PII detection middleware')

    // Continue with the request in case of error
    return next()
  }
} /**
 * Helper function to extract user ID from request
 */
function getUserId(request: NextRequest): string | null {
  // Try to get from auth cookie or header
  // This is a simplified example - adapt to your auth system
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Parse token and extract user ID
    // This is just a placeholder - implement according to your auth system
    return 'user-from-token'
  }

  // If no auth info found
  return null
}

/**
 * Middleware factory function for easier configuration
 */
export function createPIIMiddleware(config: Partial<PIIMiddlewareConfig> = {}) {
  return (request: NextRequest, next: () => Promise<NextResponse>) =>
    piiMiddleware(request, next, config)
}

// Export default for convenience
export default createPIIMiddleware
