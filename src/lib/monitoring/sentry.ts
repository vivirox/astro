/**
 * Sentry Integration for Error Monitoring
 *
 * This module provides error tracking capabilities using Sentry.io.
 * It includes initialization, error capturing, context management, and utilities.
 */

import * as Sentry from '@sentry/browser'
import type { User } from '../../lib/auth/types'
import { logger } from '../../lib/utils/logger'

// Use the default logger for Sentry operations

interface SentryConfig {
  dsn?: string
  environment?: string
  release?: string
  debug?: boolean
  enableTracing?: boolean
  tracesSampleRate?: number
  profilesSampleRate?: number
  serverName?: string
  initialScope?: Record<string, any>
}

/**
 * Initialize Sentry for both client and server-side error tracking
 */
export function initializeSentry(config: SentryConfig = {}) {
  try {
    const dsn = config.dsn || import.meta.env.PUBLIC_SENTRY_DSN

    if (!dsn) {
      logger.warn('Sentry DSN not provided. Error tracking disabled.')
      return false
    }

    Sentry.init({
      dsn,
      environment:
        config.environment ||
        import.meta.env.PUBLIC_SENTRY_ENVIRONMENT ||
        'development',
      release:
        config.release || import.meta.env.PUBLIC_SENTRY_RELEASE || undefined,

      // Integration settings
      integrations: [
        // Default integrations included automatically
        new Sentry.BrowserTracing({
          tracePropagationTargets: [/^https:\/\/[^/]*gradient-ascent\.com/],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance/tracing settings
      tracesSampleRate: config.tracesSampleRate || 0.1,
      profilesSampleRate: config.profilesSampleRate || 0.1,

      // Other settings
      debug: config.debug || import.meta.env.DEV || false,
      serverName: config.serverName,

      // Configure behavior
      beforeSend(event: Sentry.Event, hint?: Sentry.EventHint) {
        // Filter out certain errors (for example, network errors that are expected)
        const error = hint?.originalException as Error

        // Don't send errors containing "ResizeObserver loop" to Sentry
        if (
          error &&
          typeof error.message === 'string' &&
          error.message.includes('ResizeObserver loop')
        ) {
          return null
        }

        // Don't send errors containing specific user-facing URLs (privacy concerns)
        if (event.request?.url && event.request.url.includes('/user/profile')) {
          // Scrub PII from the URL
          event.request.url = event.request.url.replace(
            /\/user\/profile\/\d+/,
            '/user/profile/[REDACTED]',
          )
        }

        return event
      },
    })

    // Set initial scope if provided
    if (config.initialScope) {
      Sentry.configureScope((scope: Sentry.Scope) => {
        Object.entries(config.initialScope || {}).forEach(([key, value]) => {
          scope.setTag(key, value)
        })
      })
    }

    logger.info('Sentry initialized successfully')
    return true
  } catch (error) {
    logger.error(
      `Failed to initialize Sentry: ${error instanceof Error ? error.message : String(error)}`,
    )
    return false
  }
}

/**
 * Set user information in Sentry for error context
 */
export function setUserContext(user: User | null) {
  if (!user) {
    Sentry.setUser(null)
    return
  }

  // Only include non-PII information unless explicitly needed for diagnostics
  Sentry.setUser({
    id: user.id,
    role: user.role,
    // Don't include email, name, or other PII in general context
  })
}

/**
 * Explicitly capture an error with additional context
 */
export function captureError(
  error: Error | string,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = 'error',
) {
  try {
    // Create error if string provided
    const errorObj = typeof error === 'string' ? new Error(error) : error

    // Set context for this specific error
    if (context) {
      Sentry.withScope((scope: Sentry.Scope) => {
        scope.setLevel(level)

        // Add context as extra data
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value)
        })

        Sentry.captureException(errorObj)
      })
    } else {
      Sentry.captureException(errorObj, { level })
    }

    // Also log to console in development
    if (import.meta.env.DEV) {
      logger.error(`Error captured: ${errorObj.message}`, {
        error: errorObj,
        context,
      })
    }

    return true
  } catch (captureError) {
    logger.error(
      `Failed to capture error in Sentry: ${captureError instanceof Error ? captureError.message : String(captureError)}`,
    )
    return false
  }
}

/**
 * Set a custom tag for filtering/searching errors
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value)
}

/**
 * Add breadcrumb to track user actions leading up to an error
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>,
) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'app',
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Create a performance transaction for measuring app performance
 */
export function startTransaction(
  name: string,
  op: string = 'navigation',
): Sentry.Transaction | undefined {
  try {
    return Sentry.startTransaction({ name, op })
  } catch (error) {
    logger.error(
      `Failed to start Sentry transaction: ${error instanceof Error ? error.message : String(error)}`,
    )
    return undefined
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>,
) {
  if (context) {
    Sentry.withScope((scope: Sentry.Scope) => {
      scope.setLevel(level)

      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })

      Sentry.captureMessage(message)
    })
  } else {
    Sentry.captureMessage(message, level)
  }
}

/**
 * Check if Sentry is initialized and ready
 */
export function isSentryInitialized(): boolean {
  return Sentry.getCurrentHub().getClient() !== undefined
}

export default {
  initialize: initializeSentry,
  setUserContext,
  captureError,
  captureMessage,
  setTag,
  addBreadcrumb,
  startTransaction,
  isInitialized: isSentryInitialized,
}
