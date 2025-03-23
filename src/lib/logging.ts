/**
 * Logging utility for the application
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Type definition for log metadata value types
 */
export type LogMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | (string | number | boolean | null | undefined | Record<string, unknown>)[]

/**
 * Type definition for log metadata
 */
export type LogMetadata = Record<string, LogMetadataValue>

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: LogMetadata): void
  info(message: string, meta?: LogMetadata): void
  warn(message: string, meta?: LogMetadata): void
  error(message: string, meta?: LogMetadata): void
}

/**
 * Console-based logger implementation
 */
class ConsoleLogger implements Logger {
  private logLevel: LogLevel

  constructor(level: LogLevel = LogLevel.INFO) {
    this.logLevel = level
  }

  debug(message: string, meta?: LogMetadata): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] ${message}`, meta || '')
    }
  }

  info(message: string, meta?: LogMetadata): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, meta || '')
    }
  }

  warn(message: string, meta?: LogMetadata): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, meta || '')
    }
  }

  error(message: string, meta?: LogMetadata): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, meta || '')
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel)
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const targetLevelIndex = levels.indexOf(level)
    return targetLevelIndex >= currentLevelIndex
  }
}

// Singleton logger instance
let logger: Logger

/**
 * Get the logger instance
 *
 * @returns The logger instance
 */
export function getLogger(): Logger {
  if (!logger) {
    // Get log level from environment or use default
    const envLogLevel =
      (typeof process !== 'undefined' && process.env.LOG_LEVEL) || LogLevel.INFO
    logger = new ConsoleLogger(envLogLevel as LogLevel)
  }
  return logger
}

/**
 * Set the logger instance
 *
 * @param customLogger - The logger to use
 */
export function setLogger(customLogger: Logger): void {
  logger = customLogger
}
