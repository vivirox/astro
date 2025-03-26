/**
 * Logging utility for the therapy chat system
 * Provides consistent logging across the application
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// Define a type for log metadata that is more specific than 'any'
export type LogMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LogMetadataObjec
  | LogMetadataArray

export interface LogMetadataObject {
  [key: string]: LogMetadataValue
}

export type LogMetadataArray = LogMetadataValue[]
export type LogMetadata = Record<string, LogMetadataValue>

// Logger options
export interface LoggerOptions {
  level?: LogLevel
  prefix?: string
  includeTimestamp?: boolean
  console?: Console
  enableLogCollection?: boolean
}

// Log message forma
export interface LogMessage {
  level: LogLevel
  message: string
  timestamp: Date
  prefix?: string
  metadata?: LogMetadata
}

// Default options
const DEFAULT_OPTIONS: LoggerOptions = {
  level: LogLevel.INFO,
  prefix: '',
  includeTimestamp: true,
  console,
  enableLogCollection: false,
}

// Collected logs for debugging/telemetry
const collectedLogs: LogMessage[] = []
const MAX_COLLECTED_LOGS = 1000

/**
 * Logger class for consistent logging
 */
export class Logger {
  private options: LoggerOptions

  constructor(options?: Partial<LoggerOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param metadata Optional metadata to include
   */
  debug(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, message, metadata)
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param metadata Optional metadata to include
   */
  info(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, message, metadata)
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param metadata Optional metadata to include
   */
  warn(message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, message, metadata)
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error objec
   * @param metadata Optional metadata to include
   */
  error(message: string, error?: unknown, metadata?: LogMetadata): void {
    const errorMetadata =
      error instanceof Error
        ? {
            ...metadata,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          }
        : metadata

    this.log(LogLevel.ERROR, message, errorMetadata)
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    // Skip if log level is too low
    if (!this.shouldLog(level)) {
      return
    }

    const logMessage: LogMessage = {
      level,
      message,
      timestamp: new Date(),
      prefix: this.options.prefix,
      metadata,
    }

    // Format the log message
    const formattedMessage = this.formatLogMessage(logMessage)

    // Output to console
    switch (level) {
      case LogLevel.DEBUG:
        this.options.console?.debug(formattedMessage, metadata || '')
        break
      case LogLevel.INFO:
        this.options.console?.info(formattedMessage, metadata || '')
        break
      case LogLevel.WARN:
        this.options.console?.warn(formattedMessage, metadata || '')
        break
      case LogLevel.ERROR:
        this.options.console?.error(formattedMessage, metadata || '')
        break
    }

    // Add to collected logs if enabled
    if (this.options.enableLogCollection) {
      this.collectLog(logMessage)
    }
  }

  /**
   * Check if the log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ]
    const configuredLevelIndex = levels.indexOf(
      this.options.level || LogLevel.INFO,
    )
    const logLevelIndex = levels.indexOf(level)

    return logLevelIndex >= configuredLevelIndex
  }

  /**
   * Format a log message
   */
  private formatLogMessage(logMessage: LogMessage): string {
    const parts: string[] = []

    // Add timestamp if configured
    if (this.options.includeTimestamp) {
      parts.push(`[${logMessage.timestamp.toISOString()}]`)
    }

    // Add log level
    parts.push(`[${logMessage.level.toUpperCase()}]`)

    // Add prefix if configured
    if (logMessage.prefix) {
      parts.push(`[${logMessage.prefix}]`)
    }

    // Add message
    parts.push(logMessage.message)

    return parts.join(' ')
  }

  /**
   * Collect a log message for debugging/telemetry
   */
  private collectLog(logMessage: LogMessage): void {
    collectedLogs.push(logMessage)

    // Keep log collection under the maximum size
    if (collectedLogs.length > MAX_COLLECTED_LOGS) {
      collectedLogs.shift()
    }
  }

  /**
   * Create a child logger with a new prefix
   * @param prefix The prefix for the child logger
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.options,
      prefix: this.options.prefix ? `${this.options.prefix}:${prefix}` : prefix,
    })
  }
}

// Global logger instance
let globalLogger: Logger | null = null

/**
 * Get the global logger instance
 * Creates one if it doesn't exist
 */
export function getLogger(options?: Partial<LoggerOptions>): Logger {
  if (!globalLogger || options) {
    globalLogger = new Logger(options)
  }
  return globalLogger
}

/**
 * Get collected logs (for debugging/telemetry)
 */
export function getCollectedLogs(): LogMessage[] {
  return [...collectedLogs]
}

/**
 * Clear collected logs
 */
export function clearCollectedLogs(): void {
  collectedLogs.length = 0
}

/**
 * Configure global logging
 */
export function configureLogging(options: Partial<LoggerOptions>): void {
  globalLogger = new Logger(options)
}

// Export default logger
export default getLogger()
