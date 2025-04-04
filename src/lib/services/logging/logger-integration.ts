/**
 * Logger Integration
 *
 * Utilities for integrating the centralized logging system with the application's
 * existing Logger class. This intercepts logs from the standard Logger and forwards
 * them to centralized logging services like ELK.
 */

import type { LogMessage, LogLevel } from '@/lib/logging'
import { getLogger } from '@/lib/logging'
import elkService from './elk'

const logger = getLogger({ name: 'logger-integration' })

// Symbol to prevent infinite logging loops
const PROCESSED_SYMBOL = Symbol('PROCESSED_BY_CENTRALIZED_LOGGER')

// Original logger methods
const originalMethods = {
  debug: null as Function | null,
  info: null as Function | null,
  warn: null as Function | null,
  error: null as Function | null,
}

/**
 * Check if a log has already been processed by our integration
 */
function isAlreadyProcessed(metadata: any): boolean {
  return metadata && metadata[PROCESSED_SYMBOL] === true
}

/**
 * Mark a log as processed to prevent loops
 */
function markAsProcessed(metadata: any = {}): any {
  return { ...metadata, [PROCESSED_SYMBOL]: true }
}

/**
 * Integration options
 */
export interface LoggerIntegrationOptions {
  /**
   * Log levels to forward to centralized logging
   * Default: all levels
   */
  forwardLevels?: LogLevel[]

  /**
   * Whether to include source file information
   * Default: true in development, false in production
   */
  includeSourceInfo?: boolean

  /**
   * Whether to batch logs before sending
   * Default: true
   */
  batchLogs?: boolean

  /**
   * Batch size for sending logs
   * Default: 20
   */
  batchSize?: number

  /**
   * Batch flush interval in milliseconds
   * Default: 5000 (5 seconds)
   */
  batchFlushInterval?: number
}

/**
 * Default integration options
 */
const DEFAULT_OPTIONS: LoggerIntegrationOptions = {
  forwardLevels: ['debug', 'info', 'warn', 'error'],
  includeSourceInfo: process.env.NODE_ENV !== 'production',
  batchLogs: true,
  batchSize: 20,
  batchFlushInterval: 5000,
}

// Batched logs
const logBatch: LogMessage[] = []
let batchInterval: NodeJS.Timeout | null = null

/**
 * Flush the log batch
 */
async function flushLogBatch(): Promise<void> {
  if (logBatch.length === 0) return

  const logsToSend = [...logBatch]
  logBatch.length = 0 // Clear the batch

  try {
    await Promise.all(logsToSend.map((log) => elkService.log(log)))
    logger.debug(
      `Sent ${logsToSend.length} logs to centralized logging service`,
      markAsProcessed(),
    )
  } catch (error) {
    logger.error(
      'Failed to send logs to centralized logging service',
      error,
      markAsProcessed(),
    )

    // Return logs to the batch (at the beginning, to maintain order)
    logBatch.unshift(...logsToSend)

    // Trim batch if it's getting too large
    if (logBatch.length > 100) {
      logger.warn(
        `Log batch overflow, dropping ${logBatch.length - 100} oldest logs`,
        markAsProcessed(),
      )
      logBatch.splice(0, logBatch.length - 100)
    }
  }
}

/**
 * Add a log to the batch
 */
function addLogToBatch(log: LogMessage): void {
  logBatch.push(log)
}

/**
 * Get source information for a log
 */
function getSourceInfo(): { file?: string; line?: number; function?: string } {
  try {
    const stackLines = new Error().stack?.split('\n') || []

    // Find the first non-logger call in the stack (skip this file and logger files)
    const callerLine = stackLines.find((line) => {
      return (
        !line.includes('logger-integration.ts') &&
        !line.includes('/lib/logging/index.ts') &&
        line.includes('at ')
      )
    })

    if (!callerLine) return {}

    // Extract file, line, and function information
    const match =
      callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) ||
      callerLine.match(/at\s+()(.*):(\d+):(\d+)/)

    if (!match) return {}

    const [, fnName, filePath, lineNumber] = match

    return {
      file: filePath.split('/').slice(-2).join('/'), // Get last 2 parts of path
      line: parseInt(lineNumber, 10),
      function: fnName || 'anonymous',
    }
  } catch (error) {
    return {}
  }
}

/**
 * Process a log message for centralized logging
 */
function processLogMessage(
  level: LogLevel,
  message: string,
  metadata: any = {},
): void {
  // Skip if already processed to prevent loops
  if (isAlreadyProcessed(metadata)) return

  try {
    const options = integrationOptions

    // Skip if level is not configured to be forwarded
    if (!options.forwardLevels?.includes(level)) return

    // Create log message
    const logMessage: LogMessage = {
      level,
      message,
      timestamp: new Date(),
      metadata: { ...metadata },
    }

    // Add source information if enabled
    if (options.includeSourceInfo) {
      logMessage.metadata.source = getSourceInfo()
    }

    // Add to batch or send immediately
    if (options.batchLogs) {
      addLogToBatch(logMessage)

      // Send immediately if batch is full
      if (
        logBatch.length >= (options.batchSize || DEFAULT_OPTIONS.batchSize!)
      ) {
        flushLogBatch()
      }
    } else {
      // Send immediately
      elkService.log(logMessage)
    }
  } catch (error) {
    // Don't use logger here to avoid potential loops
    console.error('Error in centralized logging integration:', error)
  }
}

// Store integration options
let integrationOptions: LoggerIntegrationOptions = { ...DEFAULT_OPTIONS }
let isIntegrationActive = false

/**
 * Set up logger integration
 */
export function setupLoggerIntegration(
  options: LoggerIntegrationOptions = {},
): void {
  if (isIntegrationActive) {
    logger.warn('Logger integration is already active', markAsProcessed())
    return
  }

  try {
    // Merge options
    integrationOptions = { ...DEFAULT_OPTIONS, ...options }

    // Store original methods
    const LoggerPrototype = Object.getPrototypeOf(logger)
    originalMethods.debug = LoggerPrototype.debug
    originalMethods.info = LoggerPrototype.info
    originalMethods.warn = LoggerPrototype.warn
    originalMethods.error = LoggerPrototype.error

    // Override debug method
    LoggerPrototype.debug = function (message: string, metadata?: any): void {
      // Call original method
      originalMethods.debug?.call(this, message, metadata)

      // Forward to centralized logging
      processLogMessage('debug', message, metadata)
    }

    // Override info method
    LoggerPrototype.info = function (message: string, metadata?: any): void {
      // Call original method
      originalMethods.info?.call(this, message, metadata)

      // Forward to centralized logging
      processLogMessage('info', message, metadata)
    }

    // Override warn method
    LoggerPrototype.warn = function (message: string, metadata?: any): void {
      // Call original method
      originalMethods.warn?.call(this, message, metadata)

      // Forward to centralized logging
      processLogMessage('warn', message, metadata)
    }

    // Override error method
    LoggerPrototype.error = function (
      message: string,
      error?: unknown,
      metadata?: any,
    ): void {
      // Call original method
      originalMethods.error?.call(this, message, error, metadata)

      // Prepare metadata with error information
      const errorMetadata = {
        ...metadata,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
              }
            : error,
      }

      // Forward to centralized logging
      processLogMessage('error', message, errorMetadata)
    }

    // Set up batch flush interval if batching is enabled
    if (integrationOptions.batchLogs) {
      batchInterval = setInterval(
        flushLogBatch,
        integrationOptions.batchFlushInterval ||
          DEFAULT_OPTIONS.batchFlushInterval,
      )
    }

    // Clean up on process exit
    process.on('beforeExit', () => {
      teardownLoggerIntegration()
    })

    isIntegrationActive = true
    logger.info(
      'Centralized logging integration set up successfully',
      markAsProcessed(),
    )
  } catch (error) {
    logger.error(
      'Failed to set up centralized logging integration',
      error,
      markAsProcessed(),
    )
  }
}

/**
 * Tear down logger integration
 */
export function teardownLoggerIntegration(): void {
  if (!isIntegrationActive) return

  try {
    // Restore original methods
    const LoggerPrototype = Object.getPrototypeOf(logger)

    if (originalMethods.debug) LoggerPrototype.debug = originalMethods.debug
    if (originalMethods.info) LoggerPrototype.info = originalMethods.info
    if (originalMethods.warn) LoggerPrototype.warn = originalMethods.warn
    if (originalMethods.error) LoggerPrototype.error = originalMethods.error

    // Clear batch interval
    if (batchInterval) {
      clearInterval(batchInterval)
      batchInterval = null
    }

    // Flush any remaining logs
    if (logBatch.length > 0) {
      flushLogBatch()
    }

    isIntegrationActive = false
    console.log('Centralized logging integration torn down')
  } catch (error) {
    console.error('Failed to tear down centralized logging integration:', error)
  }
}

export default {
  setup: setupLoggerIntegration,
  teardown: teardownLoggerIntegration,
}
