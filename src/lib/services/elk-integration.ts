/**
 * ELK Stack Integration
 *
 * This module provides utilities for initializing and configuring the ELK
 * (Elasticsearch, Logstash, Kibana) stack integration. It serves as a central
 * point for all ELK stack related functionality.
 */

import { getLogger } from '@/lib/logging'
import {
  ELKClient,
  KibanaDashboardGenerator,
  LoggingService,
  loadLoggingConfig,
} from './logging'
import { createHttpLoggerIntegration } from './logging/middleware'
import type { AstroIntegration } from 'astro'

const logger = getLogger({ name: 'elk-integration' })

/**
 * Initialize all ELK stack related services
 */
export async function initializeELKStack() {
  // Load configuration from environment variables
  const config = loadLoggingConfig()

  if (!config.elkEnabled) {
    logger.info('ELK stack integration is disabled')
    return null
  }

  try {
    // Initialize the ELK client
    const elkClient = new ELKClient({
      enabled: config.elkEnabled,
      url: config.elkUrl,
      indexPrefix: config.elkIndexPrefix,
      username: config.elkUsername,
      password: config.elkPassword,
      apiKey: config.elkApiKey,
      nodeName: config.nodeName,
    })

    // Initialize the logging service
    const loggingService = new LoggingService({
      elkConfig: {
        enabled: config.elkEnabled,
        url: config.elkUrl,
        indexPrefix: config.elkIndexPrefix,
        username: config.elkUsername,
        password: config.elkPassword,
        apiKey: config.elkApiKey,
        nodeName: config.nodeName,
      },
      defaultTags: [
        `app:${process.env.PUBLIC_APP_NAME || 'app'}`,
        `version:${process.env.PUBLIC_APP_VERSION || '0.0.0'}`,
        `env:${process.env.NODE_ENV || 'development'}`,
      ],
      logInDevelopment:
        process.env.NODE_ENV === 'development' &&
        process.env.ELK_LOG_IN_DEV === 'true',
    })

    // Initialize the logging service
    await loggingService.initialize()

    // Initialize Kibana dashboards if URL is provided
    if (config.kibanaUrl) {
      const kibanaDashboardGenerator = new KibanaDashboardGenerator({
        kibanaUrl: config.kibanaUrl,
        username: config.elkUsername,
        password: config.elkPassword,
        apiKey: config.elkApiKey,
      })

      // Deploy standard dashboards
      await kibanaDashboardGenerator
        .deployStandardDashboards()
        .then((success) => {
          if (success) {
            logger.info('Successfully deployed Kibana dashboards')
          } else {
            logger.warn('Some Kibana dashboards could not be deployed')
          }
        })
        .catch((error) => {
          logger.error('Failed to deploy Kibana dashboards', error)
        })
    }

    logger.info('ELK stack integration initialized', {
      url: maskSensitiveUrl(config.elkUrl),
      indexPrefix: config.elkIndexPrefix,
      kibanaUrl: config.kibanaUrl
        ? maskSensitiveUrl(config.kibanaUrl)
        : undefined,
    })

    return {
      elkClient,
      loggingService,
    }
  } catch (error) {
    logger.error('Failed to initialize ELK stack integration', error)
    return null
  }
}

/**
 * Create an Astro integration for ELK stack
 */
export function createELKStackIntegration(): AstroIntegration {
  // Load configuration
  const config = loadLoggingConfig()

  if (!config.elkEnabled) {
    logger.info('ELK stack integration is disabled, skipping Astro integration')
    return {
      name: 'astro-elk-integration',
      hooks: {},
    }
  }

  // Create HTTP request logger integration
  const httpLoggerIntegration = createHttpLoggerIntegration({
    elkConfig: {
      enabled: config.elkEnabled,
      url: config.elkUrl,
      indexPrefix: config.elkIndexPrefix,
      username: config.elkUsername,
      password: config.elkPassword,
      apiKey: config.elkApiKey,
      nodeName: config.nodeName,
    },
    logInDevelopment:
      process.env.NODE_ENV === 'development' &&
      process.env.ELK_LOG_IN_DEV === 'true',
    additionalFields: {
      app: process.env.PUBLIC_APP_NAME || 'app',
      version: process.env.PUBLIC_APP_VERSION || '0.0.0',
    },
  })

  return {
    name: 'astro-elk-integration',
    hooks: {
      ...httpLoggerIntegration.hooks,

      // Add any additional hooks for ELK integration
      'astro:build:done': async () => {
        logger.info('Build completed, performing ELK integration tasks')

        // Skip in development mode unless explicitly enabled
        if (
          process.env.NODE_ENV === 'development' &&
          process.env.ELK_LOG_IN_DEV !== 'true'
        ) {
          return
        }

        // Send a build completed log to ELK
        const elkClient = new ELKClient({
          enabled: config.elkEnabled,
          url: config.elkUrl,
          indexPrefix: config.elkIndexPrefix,
          username: config.elkUsername,
          password: config.elkPassword,
          apiKey: config.elkApiKey,
          nodeName: config.nodeName,
        })

        await elkClient.log({
          level: 'info',
          message: 'Application build completed',
          context: {
            version: process.env.PUBLIC_APP_VERSION || '0.0.0',
            environment: process.env.NODE_ENV || 'development',
            buildTimestamp: new Date().toISOString(),
          },
          tags: ['build', 'deployment'],
        })

        await elkClient.shutdown()
      },
    },
  }
}

/**
 * Mask sensitive parts of URLs (for logging)
 */
function maskSensitiveUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.protocol}//${parsedUrl.host}`
  } catch (e) {
    return '[invalid url]'
  }
}

export default {
  initializeELKStack,
  createELKStackIntegration,
}
