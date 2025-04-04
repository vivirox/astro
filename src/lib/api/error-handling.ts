/**
 * API Error Handling Utility
 *
 * This module provides standardized error handling for API endpoints.
 * It includes error types, error codes, error classes, and utility functions
 * for creating consistent error responses.
 */

/**
 * Standard error types for API operations
 */
export enum APIErrorType {
  VALIDATION = 'validation_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  RATE_LIMIT = 'rate_limit_error',
  NOT_FOUND = 'not_found_error',
  CONFLICT = 'conflict_error',
  BAD_REQUEST = 'bad_request_error',
  METHOD_NOT_ALLOWED = 'method_not_allowed_error',
  INTERNAL_SERVER = 'internal_server_error',
  SERVICE_UNAVAILABLE = 'service_unavailable_error',
  DATABASE = 'database_error',
  UNKNOWN = 'unknown_error',
}

/**
 * Maps standard error types to HTTP status codes
 */
const errorTypeToStatusCode: Record<APIErrorType, number> = {
  [APIErrorType.VALIDATION]: 400,
  [APIErrorType.AUTHENTICATION]: 401,
  [APIErrorType.AUTHORIZATION]: 403,
  [APIErrorType.RATE_LIMIT]: 429,
  [APIErrorType.NOT_FOUND]: 404,
  [APIErrorType.CONFLICT]: 409,
  [APIErrorType.BAD_REQUEST]: 400,
  [APIErrorType.METHOD_NOT_ALLOWED]: 405,
  [APIErrorType.INTERNAL_SERVER]: 500,
  [APIErrorType.SERVICE_UNAVAILABLE]: 503,
  [APIErrorType.DATABASE]: 500,
  [APIErrorType.UNKNOWN]: 500,
}

/**
 * Standard error codes for API operations
 */
export const APIErrorCodes = {
  // Validation errors
  INVALID_INPUT: 'api.invalid_input',
  MISSING_REQUIRED_FIELD: 'api.missing_required_field',
  INVALID_FORMAT: 'api.invalid_format',

  // Authentication errors
  INVALID_CREDENTIALS: 'api.invalid_credentials',
  EXPIRED_TOKEN: 'api.expired_token',
  INVALID_TOKEN: 'api.invalid_token',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'api.insufficient_permissions',
  RESOURCE_FORBIDDEN: 'api.resource_forbidden',

  // Resource errors
  RESOURCE_NOT_FOUND: 'api.resource_not_found',
  RESOURCE_ALREADY_EXISTS: 'api.resource_already_exists',
  RESOURCE_CONFLICT: 'api.resource_conflict',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'api.rate_limit_exceeded',

  // Method errors
  METHOD_NOT_ALLOWED: 'api.method_not_allowed',

  // Service errors
  SERVICE_UNAVAILABLE: 'api.service_unavailable',
  DEPENDENCY_UNAVAILABLE: 'api.dependency_unavailable',

  // Database errors
  DATABASE_ERROR: 'api.database_error',
  TRANSACTION_FAILED: 'api.transaction_failed',

  // Internal errors
  INTERNAL_SERVER_ERROR: 'api.internal_error',
  UNEXPECTED_ERROR: 'api.unexpected_error',
}

/**
 * Type for additional error details
 */
export type APIErrorDetails = Record<string, unknown>

/**
 * API Error class for standardized error handling
 */
export class APIError extends Error {
  type: APIErrorType
  code: string
  status: number
  details?: APIErrorDetails

  constructor(
    message: string,
    type: APIErrorType = APIErrorType.UNKNOWN,
    code: string = APIErrorCodes.UNEXPECTED_ERROR,
    details?: APIErrorDetails,
  ) {
    super(message)
    this.name = 'APIError'
    this.type = type
    this.code = code
    this.status = errorTypeToStatusCode[type]
    this.details = details

    // Maintains proper stack trace for where our error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError)
    }
  }

  /**
   * Convert the error to a JSON response
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    }
  }

  /**
   * Convert the error to a Response object
   */
  toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

/**
 * Create a standardized API error
 */
export function createAPIError(
  message: string,
  type: APIErrorType = APIErrorType.UNKNOWN,
  code: string = APIErrorCodes.UNEXPECTED_ERROR,
  details?: APIErrorDetails,
): APIError {
  return new APIError(message, type, code, details)
}

/**
 * Handle API errors and return appropriate Response objects
 */
export function handleAPIError(error: unknown): Response {
  // Handle APIError instances
  if (error instanceof APIError) {
    return error.toResponse()
  }

  // Handle rate limit errors
  interface RateLimitError {
    type: string
    retryAfter: number
  }

  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    error?.type === 'rate_limit_exceeded'
  ) {
    const rateLimitError = error as RateLimitError
    const apiError = new APIError(
      'Rate limit exceeded',
      APIErrorType.RATE_LIMIT,
      APIErrorCodes.RATE_LIMIT_EXCEEDED,
      { retryAfter: rateLimitError.retryAfter || 60 },
    )

    const response = apiError.toResponse()

    // Add retry-after header
    response.headers.set('Retry-After', String(rateLimitError.retryAfter || 60))

    return response
  }

  // Handle TypeError (likely network errors)
  if (error instanceof TypeError) {
    return new APIError(
      'Network or system error',
      APIErrorType.INTERNAL_SERVER,
      APIErrorCodes.INTERNAL_SERVER_ERROR,
      { originalError: error.message },
    ).toResponse()
  }

  // Handle other Error types
  if (error instanceof Error) {
    return new APIError(
      error.message,
      APIErrorType.UNKNOWN,
      APIErrorCodes.UNEXPECTED_ERROR,
      { stack: error.stack },
    ).toResponse()
  }

  // Handle non-Error objects
  return new APIError(
    'An unknown error occurred',
    APIErrorType.UNKNOWN,
    APIErrorCodes.UNEXPECTED_ERROR,
    { originalError: String(error) },
  ).toResponse()
}

/**
 * Create a validation error with details about invalid fields
 */
export function createValidationError(
  message: string = 'Validation error',
  invalidFields: Record<string, string> = {},
): APIError {
  return new APIError(
    message,
    APIErrorType.VALIDATION,
    APIErrorCodes.INVALID_INPUT,
    { invalidFields },
  )
}

/**
 * Create a not found error
 */
export function createNotFoundError(
  resourceType: string,
  identifier?: string,
): APIError {
  const message = `${resourceType} not found${identifier ? `: ${identifier}` : ''}`

  return new APIError(
    message,
    APIErrorType.NOT_FOUND,
    APIErrorCodes.RESOURCE_NOT_FOUND,
    {
      resourceType,
      ...(identifier && { identifier }),
    },
  )
}

/**
 * Create an authentication error
 */
export function createAuthenticationError(
  message: string = 'Authentication required',
  code: string = APIErrorCodes.INVALID_CREDENTIALS,
): APIError {
  return new APIError(message, APIErrorType.AUTHENTICATION, code)
}

/**
 * Create an authorization error
 */
export function createAuthorizationError(
  message: string = 'Insufficient permissions',
  requiredPermissions?: string[],
): APIError {
  return new APIError(
    message,
    APIErrorType.AUTHORIZATION,
    APIErrorCodes.INSUFFICIENT_PERMISSIONS,
    requiredPermissions ? { requiredPermissions } : undefined,
  )
}

/**
 * Create a method not allowed error
 */
export function createMethodNotAllowedError(
  method: string,
  allowedMethods: string[],
): APIError {
  return new APIError(
    `Method ${method} not allowed`,
    APIErrorType.METHOD_NOT_ALLOWED,
    APIErrorCodes.METHOD_NOT_ALLOWED,
    { allowedMethods },
  )
}

/**
 * Create a service unavailable error
 */
export function createServiceUnavailableError(
  serviceName: string,
  details?: Record<string, unknown>,
): APIError {
  return new APIError(
    `Service ${serviceName} is currently unavailable`,
    APIErrorType.SERVICE_UNAVAILABLE,
    APIErrorCodes.SERVICE_UNAVAILABLE,
    details,
  )
}

/**
 * Create a conflict error
 */
export function createConflictError(
  message: string,
  details?: Record<string, unknown>,
): APIError {
  return new APIError(
    message,
    APIErrorType.CONFLICT,
    APIErrorCodes.RESOURCE_CONFLICT,
    details,
  )
}

/**
 * Create a database error
 */
export function createDatabaseError(
  message: string = 'Database operation failed',
  details?: Record<string, unknown>,
): APIError {
  return new APIError(
    message,
    APIErrorType.DATABASE,
    APIErrorCodes.DATABASE_ERROR,
    details,
  )
}

/**
 * Handle common HTTP method validation for API routes
 * Returns undefined if method is allowed, otherwise returns a Response
 */
export function validateMethod(
  method: string,
  allowedMethods: string[],
): Response | undefined {
  if (!allowedMethods.includes(method)) {
    const error = createMethodNotAllowedError(method, allowedMethods)
    const response = error.toResponse()

    // Add Allow header
    response.headers.set('Allow', allowedMethods.join(', '))

    return response
  }

  return undefined
}
