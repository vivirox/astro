/**
 * Centralized Logging Service
 *
 * This service integrates the application's logging with the ELK stack,
 * providing a unified interface for both local logging and centralized log management.
 * It extends the existing Logger functionality with ELK stack integration.
 */

import type { LoggerOptions, Logger } from '@/lib/logging'
import { getLogger, LogLevel } from '@/lib/logging'
import type { ELKConfig } from './elk-client'
import { ELKClient } from './elk-client'

const logger = getLogger({ prefix: 'logging-service' })

export interface LoggingServiceOptions {
  /** ELK stack configuration */
  elkConfig: ELKConfig
  /** Default tags to apply to all logs */
  defaultTags?: string[]
  /** Default metadata to include with all logs */
  defaultMetadata?: Record<string, any>
  /** Whether to log to ELK even in development mode */
  logInDevelopment?: boolean
}

/**
 * Enhanced Logger that integrates with the ELK stack
 */
export class EnhancedLogger implements Logger {
  private elkClient: ELKClient | null = null
  private defaultTags: string[]
  private defaultMetadata: Record<string, any>
  private serviceContext: Record<string, any> = {}
  private baseLogger: Logger
  options: LoggerOptions

  constructor(
    options: LoggerOptions & {
      elkClient?: ELKClient
      defaultTags?: string[]
      defaultMetadata?: Record<string, any>
    },
  ) {
    this.options = options
    this.baseLogger = getLogger(options)
    this.elkClient = options.elkClient || null
    this.defaultTags = options.defaultTags || []
    this.defaultMetadata = options.defaultMetadata || {}

    // Set service context for all logs
    this.serviceContext = {
      service: options.prefix || 'unknown',
      version: process.env.PUBLIC_APP_VERSION || '0.0.0',
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.baseLogger.debug(message, metadata)
    this._sendToELK(LogLevel.DEBUG, message, metadata)
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.baseLogger.info(message, metadata)
    this._sendToELK(LogLevel.INFO, message, metadata)
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.baseLogger.warn(message, metadata)
    this._sendToELK(LogLevel.WARN, message, metadata)
  }

  /**
   * Log an error message
   */
  error(message: string, metadata?: Record<string, unknown>): void {
    this.baseLogger.error(message, metadata)
    this._sendToELK(LogLevel.ERROR, message, metadata)
  }

  /**
   * Send log to ELK
   */
  private _sendToELK(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
  ): void {
    // Skip ELK logging if client is not available
    if (!this.elkClient) {
      return
    }

    try {
      // Send log to ELK
      this.elkClient.log({
        level: level.toLowerCase(),
        message,
        context: {
          ...this.serviceContext,
          ...this.defaultMetadata,
          ...context,
        },
        tags: this.defaultTags,
      })
    } catch (error) {
      // Log failures locally but don't throw
      console.error('Failed to send log to ELK', error)
    }
  }

  /**
   * Add a request context to the logger
   */
  public withRequest(req: {
    url?: string
    method?: string
    id?: string
    ip?: string
    userId?: string
    [key: string]: any
  }): EnhancedLogger {
    const requestContext = {
      request: {
        url: req.url,
        method: req.method,
        id: req.id,
        ip: req.ip,
        userId: req.userId,
      },
    }

    return new EnhancedLogger({
      ...this.options,
      elkClient: this.elkClient,
      defaultTags: this.defaultTags,
      defaultMetadata: {
        ...this.defaultMetadata,
        ...requestContext,
      },
    })
  }

  /**
   * Add user context to the logger
   */
  public withUser(user: {
    id: string
    email?: string
    role?: string
    [key: string]: any
  }): EnhancedLogger {
    const userContext = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }

    return new EnhancedLogger({
      ...this.options,
      elkClient: this.elkClient,
      defaultTags: [...this.defaultTags, `user:${user.id}`],
      defaultMetadata: {
        ...this.defaultMetadata,
        ...userContext,
      },
    })
  }

  /**
   * Add custom tags to the logger
   */
  public withTags(tags: string[]): EnhancedLogger {
    return new EnhancedLogger({
      ...this.options,
      elkClient: this.elkClient,
      defaultTags: [...this.defaultTags, ...tags],
      defaultMetadata: this.defaultMetadata,
    })
  }

  /**
   * Add context metadata to the logger
   */
  public withContext(metadata: Record<string, any>): EnhancedLogger {
    return new EnhancedLogger({
      ...this.options,
      elkClient: this.elkClient,
      defaultTags: this.defaultTags,
      defaultMetadata: {
        ...this.defaultMetadata,
        ...metadata,
      },
    })
  }
}

/**
 * Centralized Logging Service
 */
export class LoggingService {
  private elkClient: ELKClient
  private options: LoggingServiceOptions
  private initialized = false

  constructor(options: LoggingServiceOptions) {
    this.options = {
      ...options,
      logInDevelopment: options.logInDevelopment ?? false,
    }

    // Skip ELK in development unless explicitly enabled
    const elkEnabled =
      this.options.elkConfig.enabled &&
      (this.options.logInDevelopment || process.env.NODE_ENV !== 'development')

    this.elkClient = new ELKClient({
      ...this.options.elkConfig,
      enabled: elkEnabled,
    })
  }

  /**
   * Initialize the logging service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Nothing specific to initialize yet, but we might add hooks later
      this.initialized = true
      logger.info('Logging service initialized', {
        elkEnabled: this.options.elkConfig.enabled,
        environment: process.env.NODE_ENV,
      })
    } catch (error) {
      logger.error('Failed to initialize logging service', error)
      throw error
    }
  }

  /**
   * Create an enhanced logger with ELK integration
   */
  public createLogger(options: LoggerOptions): EnhancedLogger {
    return new EnhancedLogger({
      ...options,
      elkClient: this.elkClient,
      defaultTags: this.options.defaultTags,
      defaultMetadata: this.options.defaultMetadata,
    })
  }

  /**
   * Get an enhanced version of an existing logger
   */
  public enhanceLogger(existingLogger: Logger): EnhancedLogger {
    return new EnhancedLogger({
      ...existingLogger.options,
      elkClient: this.elkClient,
      defaultTags: this.options.defaultTags,
      defaultMetadata: this.options.defaultMetadata,
    })
  }

  /**
   * Shutdown the logging service
   */
  public async shutdown(): Promise<void> {
    await this.elkClient.shutdown()
    logger.info('Logging service shut down')
  }
}

export default LoggingService
