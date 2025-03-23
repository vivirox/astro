/**
 * Service Worker Registration Utility
 * This file provides utilities for managing the service worker
 */

// Default service worker configuration
const defaultConfig = {
  enabled: true,
  debug: {
    enabled: false,
  },
  scope: '/',
  backgroundSync: {
    enabled: false,
    queueName: 'sync-queue',
  },
  pushNotifications: {
    enabled: false,
    options: {
      userVisibleOnly: true,
    },
    publicKey: '',
  },
}

/**
 * Service Worker Manager class
 * Handles registration, updates, and management of the service worker
 */
export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private debug: boolean
  private config: typeof defaultConfig

  constructor(config = defaultConfig) {
    this.config = config
    this.debug = config.debug.enabled
  }

  /**
   * Check if Service Workers are supported in this browser
   */
  public isSupported(): boolean {
    return 'serviceWorker' in navigator
  }

  /**
   * Register the service worker
   */
  public async register(): Promise<void> {
    if (!this.config.enabled || !this.isSupported()) {
      return
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: this.config.scope,
      })

      if (this.debug) {
        console.log('Service Worker registered successfully')
      }

      await this.setupSync()
      await this.setupPushNotifications()
    } catch (error) {
      this.logError('Service Worker registration failed', error)
    }
  }

  /**
   * Check for updates to the service worker
   */
  public async update(): Promise<void> {
    if (!this.registration) {
      await this.register()
      return
    }

    try {
      await this.registration.update()
      if (this.debug) {
        console.log('Service Worker update check completed')
      }
    } catch (error) {
      this.logError('Service Worker update check failed', error)
    }
  }

  /**
   * Set up background sync if enabled and supported
   */
  private async setupSync(): Promise<void> {
    if (!this.registration || !this.config.backgroundSync.enabled) {
      return
    }

    try {
      const registration = this.registration as ServiceWorkerRegistration & {
        sync?: { register(tag: string): Promise<void> }
      }

      if ('sync' in registration && registration.sync) {
        await registration.sync.register(this.config.backgroundSync.queueName)
        if (this.debug) {
          console.log('Background sync registered successfully')
        }
      }
    } catch (error) {
      this.logError('Background sync registration failed', error)
    }
  }

  /**
   * Set up push notifications if enabled and supported
   */
  private async setupPushNotifications(): Promise<void> {
    if (!this.registration || !this.config.pushNotifications.enabled) {
      return
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: this.config.pushNotifications.options.userVisibleOnly,
        applicationServerKey: this.config.pushNotifications.publicKey,
      })

      if (this.debug) {
        console.log('Push notification subscription:', subscription)
      }
    } catch (error) {
      this.logError('Push notification registration failed', error)
    }
  }

  /**
   * Log errors in debug mode
   */
  private logError(message: string, error: unknown): void {
    if (this.debug) {
      console.error(message, error)
    }
  }
}

// Export a singleton instance
export const serviceWorkerManager = new ServiceWorkerManager()
