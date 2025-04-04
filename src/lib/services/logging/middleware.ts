/**
 * HTTP Request Logging Middleware
 *
 * This middleware logs all HTTP requests to the ELK stack.
 * It captures request details, response status, timing, and other metrics.
 */

import type { AstroIntegration } from 'astro'
import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { getLogger } from '@/lib/logging'
import { ELKClient, type ELKConfig } from './elk-client'

const logger = getLogger({ name: 'http-logger' })

export interface RequestLoggerOptions {
  /** ELK client configuration */
  elkConfig: ELKConfig
  /** Log format string or function */
  logFormat?:
    | string
    | ((req: Request, res: Response, responseTime: number) => string)
  /** Whether to include the request body (default: false) */
  logRequestBody?: boolean
  /** Whether to include the response body (default: false) */
  logResponseBody?: boolean
  /** Whether to log even in development mode */
  logInDevelopment?: boolean
  /** Routes to skip logging (regex patterns) */
  skipRoutes?: (string | RegExp)[]
  /** Maximum length of request/response body to log */
  maxBodyLength?: number
  /** Additional fields to include with each log */
  additionalFields?: Record<string, any>
}

// Default options
const defaultOptions: Partial<RequestLoggerOptions> = {
  logRequestBody: false,
  logResponseBody: false,
  logInDevelopment: false,
  skipRoutes: [
    /^\/assets\//,
    /^\/public\//,
    /^\/favicon\.ico$/,
    /^\/robots\.txt$/,
    /\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf|eot)$/i,
  ],
  maxBodyLength: 1000,
  logFormat: '[:method] :url :status :response-time ms',
}

/**
 * Create a middleware for Express-compatible middleware stack
 */
export function createRequestLoggerMiddleware(options: RequestLoggerOptions) {
  const mergedOptions = { ...defaultOptions, ...options }

  // Skip ELK in development unless explicitly enabled
  const elkEnabled =
    options.elkConfig.enabled &&
    (mergedOptions.logInDevelopment || process.env.NODE_ENV !== 'development')

  const elkClient = new ELKClient({
    ...options.elkConfig,
    enabled: elkEnabled,
  })

  return async function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    // Skip logging for certain routes
    if (
      mergedOptions.skipRoutes?.some((pattern) => {
        if (typeof pattern === 'string') {
          return req.path === pattern
        }
        return pattern.test(req.path)
      })
    ) {
      return next()
    }

    // Generate unique request ID if not present
    const requestId = (req.headers['x-request-id'] as string) || randomUUID()
    req.headers['x-request-id'] = requestId

    // Capture start time
    const startTime = process.hrtime()

    // Capture original methods to intercept response
    const originalEnd = res.end
    const originalWrite = res.write
    const chunks: Buffer[] = []

    // Intercept response data if needed
    if (mergedOptions.logResponseBody) {
      res.write = function (chunk: any, ...args: any[]) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk)
        } else if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk))
        }
        return originalWrite.apply(res, [chunk, ...args])
      }
    }

    // Track response completion
    res.end = function (chunk: any, ...args: any[]) {
      if (mergedOptions.logResponseBody && chunk) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk)
        } else if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk))
        }
      }

      res.end = originalEnd
      res.write = originalWrite

      const result = originalEnd.apply(res, [chunk, ...args])

      // Calculate response time
      const hrTime = process.hrtime(startTime)
      const responseTimeMs = (hrTime[0] * 1000 + hrTime[1] / 1000000).toFixed(3)

      // Build the log entry
      let logMessage = ''
      if (typeof mergedOptions.logFormat === 'function') {
        logMessage = mergedOptions.logFormat(
          req,
          res,
          parseFloat(responseTimeMs),
        )
      } else {
        logMessage =
          mergedOptions.logFormat || (defaultOptions.logFormat as string)
        logMessage = logMessage
          .replace(':method', req.method)
          .replace(':url', req.originalUrl || req.url)
          .replace(':status', res.statusCode.toString())
          .replace(':response-time', responseTimeMs)
      }

      const requestBody = mergedOptions.logRequestBody
        ? truncate(getRequestBody(req), mergedOptions.maxBodyLength || 1000)
        : undefined

      const responseBody = mergedOptions.logResponseBody
        ? truncate(getResponseBody(chunks), mergedOptions.maxBodyLength || 1000)
        : undefined

      // Log to ELK stack
      elkClient
        .log({
          level: 'info',
          message: logMessage,
          context: {
            request: {
              id: requestId,
              method: req.method,
              url: req.originalUrl || req.url,
              path: req.path,
              headers: sanitizeHeaders(req.headers),
              query: req.query,
              params: req.params,
              body: requestBody,
              ip: req.ip || req.connection?.remoteAddress,
              userAgent: req.headers['user-agent'],
            },
            response: {
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              headers: sanitizeHeaders(res.getHeaders()),
              body: responseBody,
              responseTime: parseFloat(responseTimeMs),
            },
            ...mergedOptions.additionalFields,
          },
          tags: [
            'http',
            `status:${res.statusCode}`,
            `method:${req.method.toLowerCase()}`,
          ],
        })
        .catch((err) => {
          logger.error('Failed to log HTTP request to ELK', err)
        })

      return result
    }

    next()
  }
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(headers)) {
    // Skip sensitive headers
    if (
      key.toLowerCase() === 'authorization' ||
      key.toLowerCase() === 'cookie' ||
      key.toLowerCase() === 'set-cookie' ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('token')
    ) {
      sanitized[key] = '[REDACTED]'
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Get request body safely
 */
function getRequestBody(req: Request): string | undefined {
  if (!req.body) {
    return undefined
  }

  try {
    if (typeof req.body === 'string') {
      return req.body
    }
    return JSON.stringify(req.body)
  } catch (e) {
    return '[Unable to serialize request body]'
  }
}

/**
 * Get response body from captured chunks
 */
function getResponseBody(chunks: Buffer[]): string | undefined {
  if (!chunks.length) {
    return undefined
  }

  try {
    const body = Buffer.concat(chunks).toString('utf8')

    // Try to parse as JSON for cleaner logging
    try {
      const json = JSON.parse(body)
      return JSON.stringify(json)
    } catch {
      return body
    }
  } catch (e) {
    return '[Unable to serialize response body]'
  }
}

/**
 * Truncate string to a maximum length
 */
function truncate(
  str: string | undefined,
  maxLength: number,
): string | undefined {
  if (!str) {
    return undefined
  }

  if (str.length <= maxLength) {
    return str
  }

  return str.substring(0, maxLength) + '... [truncated]'
}

/**
 * Create an Astro integration for HTTP request logging
 */
export function createHttpLoggerIntegration(
  options: RequestLoggerOptions,
): AstroIntegration {
  return {
    name: 'astro-http-logger',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({
          pattern: '/_logging/health',
          entrypoint: 'src/pages/api/_logging/health.ts',
        })
      },

      'astro:server:setup': ({ server }) => {
        const middleware = createRequestLoggerMiddleware(options)
        server.middlewares.use(middleware)
      },
    },
  }
}

/**
 * Create a clean-up function to properly close the ELK client
 */
export function createHttpLoggerCleanup(options: RequestLoggerOptions) {
  const elkClient = new ELKClient(options.elkConfig)

  return async function cleanup() {
    await elkClient.shutdown()
  }
}

export default createRequestLoggerMiddleware
