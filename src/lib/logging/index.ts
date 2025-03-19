import { v4 as uuidv4 } from "uuid";
import { createAuditLog } from "../audit/log";

// Log levels
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  context?: Record<string, any>;
}

// Logger options
export interface LoggerOptions {
  minLevel?: LogLevel;
  console?: boolean;
  audit?: boolean;
  metadata?: Record<string, any>;
}

// Default options
const defaultOptions: LoggerOptions = {
  minLevel: LogLevel.INFO,
  console: true,
  audit: true,
  metadata: {},
};

/**
 * Request context for maintaining request-specific data
 */
class RequestContext {
  private static requestMap = new Map<string, Record<string, any>>();

  /**
   * Get or create context for a request ID
   */
  static getContext(requestId: string): Record<string, any> {
    if (!this.requestMap.has(requestId)) {
      this.requestMap.set(requestId, {});
    }
    return this.requestMap.get(requestId)!;
  }

  /**
   * Set context value for a request ID
   */
  static setValue(requestId: string, key: string, value: any): void {
    const context = this.getContext(requestId);
    context[key] = value;
  }

  /**
   * Get context value for a request ID
   */
  static getValue(requestId: string, key: string): any {
    const context = this.getContext(requestId);
    return context[key];
  }

  /**
   * Clean up context for a request ID
   */
  static cleanup(requestId: string): void {
    this.requestMap.delete(requestId);
  }
}

/**
 * Structured logger with request ID tracking
 */
export class Logger {
  private options: LoggerOptions;
  private requestId: string;

  constructor(requestId?: string, options?: Partial<LoggerOptions>) {
    this.options = { ...defaultOptions, ...options };
    this.requestId = requestId || uuidv4();
  }

  /**
   * Get the current request ID
   */
  getRequestId(): string {
    return this.requestId;
  }

  /**
   * Set context value for the current request
   */
  setContext(key: string, value: any): void {
    RequestContext.setValue(this.requestId, key, value);
  }

  /**
   * Get context value for the current request
   */
  getContext(key: string): any {
    return RequestContext.getValue(this.requestId, key);
  }

  /**
   * Create a child logger with the same request ID
   */
  child(additionalMetadata: Record<string, any> = {}): Logger {
    return new Logger(this.requestId, {
      ...this.options,
      metadata: {
        ...this.options.metadata,
        ...additionalMetadata,
      },
    });
  }

  /**
   * Log a message at DEBUG level
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a message at INFO level
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a message at WARN level
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log a message at ERROR level
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    const errorContext = error
      ? {
          ...context,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack,
          },
        }
      : context;

    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Log a message
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
  ): void {
    // Skip if below minimum level
    if (this.shouldSkip(level)) {
      return;
    }

    const timestamp = new Date();
    const requestContext = RequestContext.getContext(this.requestId);

    const entry: LogEntry = {
      level,
      message,
      timestamp,
      requestId: this.requestId,
      userId: requestContext.userId,
      context: {
        ...this.options.metadata,
        ...requestContext,
        ...context,
      },
    };

    // Log to console
    if (this.options.console) {
      this.logToConsole(entry);
    }

    // Log to audit log
    if (this.options.audit) {
      this.logToAudit(entry);
    }
  }

  /**
   * Check if a log level should be skipped
   */
  private shouldSkip(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    const minLevelIndex = levels.indexOf(
      this.options.minLevel || LogLevel.INFO,
    );
    const currentLevelIndex = levels.indexOf(level);

    return currentLevelIndex < minLevelIndex;
  }

  /**
   * Log to console in structured format
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, timestamp, requestId, context } = entry;

    const logObject = {
      timestamp: timestamp.toISOString(),
      level,
      requestId,
      message,
      ...context,
    };

    // Use appropriate console method based on level
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(logObject));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(logObject));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logObject));
        break;
      case LogLevel.ERROR:
        console.error(JSON.stringify(logObject));
        break;
    }
  }

  /**
   * Log to audit log system
   */
  private async logToAudit(entry: LogEntry): Promise<void> {
    try {
      // Only log INFO and above to audit logs
      if (entry.level === LogLevel.DEBUG) {
        return;
      }

      const { userId, context } = entry;

      await createAuditLog({
        userId: userId || "system",
        action: `log.${entry.level}`,
        resource: "application",
        metadata: {
          requestId: entry.requestId,
          message: entry.message,
          timestamp: entry.timestamp.toISOString(),
          context: context || {},
        },
      });
    } catch (error) {
      console.error("Failed to write to audit log:", error);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    RequestContext.cleanup(this.requestId);
  }
}

// Create a default logger instance
const defaultLogger = new Logger();

// Export a function to get a logger instance
export function getLogger(
  requestId?: string,
  options?: Partial<LoggerOptions>,
): Logger {
  return requestId ? new Logger(requestId, options) : defaultLogger;
}
