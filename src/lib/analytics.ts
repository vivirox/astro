/**
 * Analytics Service
 *
 * Provides privacy-preserving analytics for the therapy chat application
 * without exposing Protected Health Information (PHI).
 * Uses differential privacy techniques and aggregation to ensure HIPAA compliance.
 */

import { getLogger } from './logging'

// Initialize logger
const logger = getLogger()

// Analytics event types
export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  FEATURE_USAGE = 'feature_usage',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  CHAT_METRICS = 'chat_metrics',
  SECURITY = 'security',
  USER_BEHAVIOR = 'user_behavior',
}

// Define value types that can be used in analytics data
export type AnalyticsValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | AnalyticsObjec
  | AnalyticsArray
export interface AnalyticsObject {
  [key: string]: AnalyticsValue
}
export type AnalyticsArray = AnalyticsValue[]

// Analytics data type
export type AnalyticsData = Record<string, AnalyticsValue>

// Analytics metadata type
export interface AnalyticsMetadata {
  userAgent: string
  language: string
  platform: string
  screenSize: string
  [key: string]: AnalyticsValue
}

// Analytics event interface
export interface AnalyticsEvent {
  eventType: AnalyticsEventType
  eventName: string
  data: AnalyticsData
  timestamp: number
  sessionId?: string
  userId?: string // Anonymized user ID, not actual user ID
  metadata?: AnalyticsMetadata
}

// Configuration for the analytics service
interface AnalyticsConfig {
  enabled: boolean
  differentialPrivacyEnabled: boolean
  privacyBudget: number
  endpointUrl?: string
  bufferSize: number
  flushIntervalMs: number
  anonymize: boolean
  debugMode: boolean
}

// Default configuration
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  differentialPrivacyEnabled: true,
  privacyBudget: 1.0, // Epsilon value for differential privacy
  endpointUrl: process.env.ANALYTICS_ENDPOINT,
  bufferSize: 20,
  flushIntervalMs: 30000, // 30 seconds
  anonymize: true,
  debugMode: process.env.NODE_ENV === 'development',
}

/**
 * Analytics Service Class
 *
 * Provides methods for tracking events while ensuring privacy compliance
 */
export class AnalyticsService {
  private static instance: AnalyticsService
  private config: AnalyticsConfig
  private eventBuffer: AnalyticsEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private sessionId: string
  private anonymousId: string

  /**
   * Private constructor (singleton pattern)
   */
  private constructor(config: AnalyticsConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.anonymousId = this.generateAnonymousId()

    if (this.config.enabled) {
      this.startFlushTimer()
      logger.info('Analytics service initialized')
    }
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(config?: AnalyticsConfig): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService(config)
    }
    return AnalyticsService.instance
  }

  /**
   * Generate a anonymous session ID
   */
  private generateSessionId(): string {
    if (typeof window === 'undefined') {
      return `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }

    // Try to get from storage firs
    const storedId = sessionStorage.getItem('analytics_session_id')
    if (storedId) return storedId

    // Generate a new one if not found
    const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    sessionStorage.setItem('analytics_session_id', newId)
    return newId
  }

  /**
   * Generate an anonymous user ID
   */
  private generateAnonymousId(): string {
    if (typeof window === 'undefined') {
      return `anon-${Math.random().toString(36).substring(2, 9)}`
    }

    // Try to get from storage firs
    const storedId = localStorage.getItem('analytics_anonymous_id')
    if (storedId) return storedId

    // Generate a new one if not found
    const newId = `anon-${Math.random().toString(36).substring(2, 16)}`
    localStorage.setItem('analytics_anonymous_id', newId)
    return newId
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushIntervalMs)
  }

  /**
   * Flush the event buffer
   */
  private async flush(): Promise<void> {
    if (!this.config.enabled || this.eventBuffer.length === 0) {
      return
    }

    const events = [...this.eventBuffer]
    this.eventBuffer = []

    try {
      // Apply differential privacy if enabled
      const processedEvents = this.config.differentialPrivacyEnabled
        ? this.applyDifferentialPrivacy(events)
        : events

      // Send events to endpoint if available
      if (this.config.endpointUrl) {
        await this.sendToEndpoint(processedEvents)
      }

      // Save to local storage as backup
      this.saveToLocalStorage(processedEvents)

      if (this.config.debugMode) {
        logger.debug(`Flushed ${events.length} analytics events`)
      }
    } catch (error) {
      logger.error('Failed to flush analytics events', error)

      // Put events back in buffer
      this.eventBuffer = [...events, ...this.eventBuffer]

      // Trim buffer if it gets too large
      if (this.eventBuffer.length > this.config.bufferSize * 2) {
        this.eventBuffer = this.eventBuffer.slice(-this.config.bufferSize)
      }
    }
  }

  /**
   * Apply differential privacy to events
   * This adds noise to numeric values to preserve privacy
   */
  private applyDifferentialPrivacy(events: AnalyticsEvent[]): AnalyticsEvent[] {
    return events.map((event) => {
      // Create a deep copy of the even
      const newEvent = { ...event, data: { ...event.data } }

      // Add noise to sensitive numeric values
      Object.keys(newEvent.data).forEach((key) => {
        const value = newEvent.data[key]

        // Add Laplace noise to numeric values
        if (typeof value === 'number') {
          const sensitivity = 1.0 // Assume sensitivity of 1
          const epsilon = this.config.privacyBudge
          const noise = this.laplacianNoise(sensitivity / epsilon)
          newEvent.data[key] = Math.round((value + noise) * 100) / 100
        }
      })

      return newEven
    })
  }

  /**
   * Generate Laplacian noise for differential privacy
   */
  private laplacianNoise(scale: number): number {
    const u = Math.random() - 0.5
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
  }

  /**
   * Send events to the analytics endpoin
   */
  private async sendToEndpoint(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.endpointUrl) return

    try {
      const response = await fetch(this.config.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ANALYTICS_API_KEY || '',
        },
        body: JSON.stringify({
          events,
          source: 'therapy-chat-app',
          timestamp: Date.now(),
          batchId: `batch-${Date.now()}`,
        }),
      })

      if (!response.ok) {
        throw new Error(
          `Analytics API response: ${response.status} ${response.statusText}`,
        )
      }
    } catch (error) {
      logger.error('Failed to send analytics to endpoint', error)
      throw error
    }
  }

  /**
   * Save events to local storage as backup
   */
  private saveToLocalStorage(events: AnalyticsEvent[]): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      // Get existing events
      const existingEventsJson = localStorage.getItem('analytics_events')
      const existingEvents: AnalyticsEvent[] = existingEventsJson
        ? JSON.parse(existingEventsJson)
        : []

      // Add new events
      const allEvents = [...existingEvents, ...events]

      // Keep only the last 1000 events
      const trimmedEvents = allEvents.slice(-1000)

      // Save back to storage
      localStorage.setItem('analytics_events', JSON.stringify(trimmedEvents))
    } catch (error) {
      logger.error('Failed to save analytics to local storage', error)
    }
  }

  /**
   * Anonymize data to remove PHI
   */
  private anonymizeData(data: AnalyticsData): AnalyticsData {
    if (!this.config.anonymize) {
      return data
    }

    const result: AnalyticsData = {}

    // Map of fields that should be anonymized
    const sensitiveFields = [
      'name',
      'email',
      'phone',
      'address',
      'socialSecurity',
      'dob',
      'birthDate',
      'diagnosis',
      'condition',
      'medication',
      'treatment',
      'therapistNotes',
      'patientId',
      'medicalRecordNumber',
      'insuranceId',
    ]

    // Copy and anonymize
    Object.keys(data).forEach((key) => {
      const value = data[key]

      // Skip null or undefined values
      if (value === null || value === undefined) {
        result[key] = value
        return
      }

      // Handle different types of values
      if (typeof value === 'string') {
        // Check if this is a sensitive field
        if (
          sensitiveFields.some((field) =>
            key.toLowerCase().includes(field.toLowerCase()),
          )
        ) {
          result[key] = '[REDACTED]'
        } else if (value.length > 100) {
          // Likely a text content, sanitize i
          result[key] = this.sanitizeTextContent(value)
        } else {
          result[key] = value
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively anonymize nested objects
        result[key] = Array.isArray(value)
          ? value.map((item) =>
              typeof item === 'object' && item !== null
                ? this.anonymizeData(item as AnalyticsObject)
                : item,
            )
          : this.anonymizeData(value as AnalyticsObject)
      } else {
        // Numbers, booleans, etc. are safe to pass through
        result[key] = value
      }
    })

    return result
  }

  /**
   * Sanitize text content to remove potential PHI
   */
  private sanitizeTextContent(text: string): string {
    // Simple sanitization to remove potential PII/PHI
    // In a production system, this would use NLP and entity recognition

    return (
      text
        // Replace email patterns
        .replace(/[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]')
        // Replace phone number patterns
        .replace(
          /(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
          '[PHONE]',
        )
        // Replace common PII patterns like SSN
        .replace(/\d{3}-\d{2}-\d{4}/g, '[SSN]')
        // Replace credit card patterns
        .replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '[CREDIT_CARD]')
        // Replace date patterns
        .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '[DATE]')
    )
  }

  /**
   * Record an analytics even
   */
  public recordEvent(
    eventName: string,
    data: AnalyticsData = {},
    eventType: AnalyticsEventType = AnalyticsEventType.FEATURE_USAGE,
  ): void {
    if (!this.config.enabled) {
      return
    }

    try {
      // Anonymize the data
      const safeData = this.anonymizeData(data)

      // Create the even
      const event: AnalyticsEvent = {
        eventType,
        eventName,
        data: safeData,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.anonymousId,
        metadata: {
          userAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
          language:
            typeof navigator !== 'undefined' ? navigator.language : 'unknown',
          platform:
            typeof navigator !== 'undefined' ? navigator.platform : 'server',
          screenSize:
            typeof window !== 'undefined'
              ? `${window.innerWidth}x${window.innerHeight}`
              : 'unknown',
        },
      }

      // Add to buffer
      this.eventBuffer.push(event)

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.config.bufferSize) {
        this.flush()
      }

      if (this.config.debugMode) {
        logger.debug(`Recorded analytics event: ${eventName}`, safeData)
      }
    } catch (error) {
      logger.error(`Failed to record analytics event: ${eventName}`, error)
    }
  }

  /**
   * Record a page view
   */
  public recordPageView(page: string, referrer?: string): void {
    this.recordEvent(
      'page_view',
      {
        page,
        referrer:
          referrer ||
          (typeof document !== 'undefined' ? document.referrer : 'unknown'),
        title: typeof document !== 'undefined' ? document.title : 'unknown',
      },
      AnalyticsEventType.PAGE_VIEW,
    )
  }

  /**
   * Record a feature usage
   */
  public recordFeatureUsage(
    feature: string,
    action: string,
    extraData: AnalyticsData = {},
  ): void {
    this.recordEvent(
      'feature_usage',
      {
        feature,
        action,
        ...extraData,
      },
      AnalyticsEventType.FEATURE_USAGE,
    )
  }

  /**
   * Record an error
   */
  public recordError(
    errorType: string,
    message: string,
    stack?: string,
    extraData: AnalyticsData = {},
  ): void {
    this.recordEvent(
      'error',
      {
        errorType,
        message,
        stack,
        ...extraData,
      },
      AnalyticsEventType.ERROR,
    )
  }

  /**
   * Record performance metrics
   */
  public recordPerformance(
    metric: string,
    value: number,
    extraData: AnalyticsData = {},
  ): void {
    this.recordEvent(
      'performance',
      {
        metric,
        value,
        ...extraData,
      },
      AnalyticsEventType.PERFORMANCE,
    )
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Update flush timer if interval changed
    if (newConfig.flushIntervalMs && this.flushTimer) {
      this.startFlushTimer()
    }

    // Flush now if being disabled
    if (newConfig.enabled === false && this.eventBuffer.length > 0) {
      this.flush()
    }
  }

  /**
   * Get recorded events (for debugging)
   */
  public getEvents(): AnalyticsEvent[] {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const eventsJson = localStorage.getItem('analytics_events')
      return eventsJson ? JSON.parse(eventsJson) : []
    } catch (error) {
      logger.error('Failed to get analytics events', error)
      return []
    }
  }

  /**
   * Clear recorded events (for debugging or privacy requests)
   */
  public clearEvents(): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.removeItem('analytics_events')
      this.eventBuffer = []
      logger.info('Analytics events cleared')
    } catch (error) {
      logger.error('Failed to clear analytics events', error)
    }
  }

  /**
   * Force flush the event buffer
   */
  public forceFlush(): Promise<void> {
    return this.flush()
  }
}

// Export an instance
export default AnalyticsService.getInstance()
