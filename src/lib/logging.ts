/**
 * Logging utility for the application
 */
import { env } from 'node:process'

/**
 * Log levels in order of increasing severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Type definition for structured log data
 */
export interface LogData {
  message: string
  level: LogLevel
  timestamp: number
  metadata?: Record<string, unknown>
}

/**
 * Logger interface defining the core logging operations
 */
export interface Logger {
  debug: (message: string, metadata?: Record<string, unknown>) => void
  info: (message: string, metadata?: Record<string, unknown>) => void
  warn: (message: string, metadata?: Record<string, unknown>) => void
  error: (message: string, metadata?: Record<string, unknown>) => void
}

/**
 * Console-based logger implementation that respects log levels
 * and provides structured logging capabilities
 */
class ConsoleLogger implements Logger {
  private logLevel: LogLevel
  private isDevelopment: boolean

  constructor(level: LogLevel = LogLevel.INFO) {
    this.logLevel = level
    this.isDevelopment = env.NODE_ENV === 'development'
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
  ): LogData {
    return {
      message,
      level,
      timestamp: Date.now(),
      metadata,
    }
  }

  private formatLogEntry({
    message,
    level,
    timestamp,
    metadata,
  }: LogData): string {
    const time = new Date(timestamp).toISOString()
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : ''
    return `[${time}] [${level.toUpperCase()}] ${message}${metadataStr}`
  }

  private writeLog(entry: LogData): void {
    const formattedMessage = this.formatLogEntry(entry)

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formattedMessage)
        break
      case LogLevel.WARN:
      case LogLevel.INFO:
      case LogLevel.DEBUG:
        console.warn(formattedMessage)
        break
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel)
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const targetLevelIndex = levels.indexOf(level)
    return targetLevelIndex >= currentLevelIndex
  }

  debug: (message: string, metadata?: Record<string, unknown>) => void = (
    message,
    metadata,
  ) => {
    if (this.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, metadata))
    }
  }

  info: (message: string, metadata?: Record<string, unknown>) => void = (
    message,
    metadata,
  ) => {
    if (this.isDevelopment && this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.createLogEntry(LogLevel.INFO, message, metadata))
    }
  }

  warn: (message: string, metadata?: Record<string, unknown>) => void = (
    message,
    metadata,
  ) => {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.createLogEntry(LogLevel.WARN, message, metadata))
    }
  }

  error: (message: string, metadata?: Record<string, unknown>) => void = (
    message,
    metadata,
  ) => {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog(this.createLogEntry(LogLevel.ERROR, message, metadata))
    }
  }
}

// Singleton logger instance
let loggerInstance: Logger

/**
 * Get the logger instance, creating it if necessary
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    const envLogLevel = (env.LOG_LEVEL as LogLevel) || LogLevel.INFO
    loggerInstance = new ConsoleLogger(envLogLevel)
  }
  return loggerInstance
}

/**
 * Set a custom logger implementation
 */
export function setLogger(customLogger: Logger): void {
  loggerInstance = customLogger
}

/**
 * Default logger instance with simplified interface
 */
export const appLogger = getLogger()
