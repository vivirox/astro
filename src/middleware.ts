import { defineMiddleware } from 'astro/middleware'
import sentry from './lib/monitoring/sentry'
import loggingServices from './lib/services/logging'


// Initialize Sentry once when middleware is first loaded
const isSentryInitialized = sentry.initialize({
  serverName: 'astro-server',
  initialScope: {
    tags: {
      astro: 'server',
      app: 'gradiant-ascent',
    },
  },
})

// Initialize logging services
loggingServices.initialize({
  elk: {
    enabled: process.env.ELK_ENABLED === 'true',
    url: process.env.ELK_URL || 'http://localhost:9200',
    indexPrefix: process.env.ELK_INDEX_PREFIX || 'app-logs',
    apiKey: process.env.ELK_API_KEY,
    username: process.env.ELK_USERNAME,
    password: process.env.ELK_PASSWORD,
    nodeName: process.env.ELK_NODE_NAME || 'astro-node',
  },
  retention: {
    defaultRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90', 10),
    retentionByType: {
      applicationLogs: parseInt(process.env.APP_LOG_RETENTION_DAYS || '90', 10),
      apiLogs: parseInt(process.env.API_LOG_RETENTION_DAYS || '90', 10),
      errorLogs: parseInt(process.env.ERROR_LOG_RETENTION_DAYS || '180', 10),
      securityLogs: parseInt(
        process.env.SECURITY_LOG_RETENTION_DAYS || '365',
        10,
      ),
      auditLogs: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '730', 10),
    },
    archiving: {
      enabled: process.env.LOG_ARCHIVING_ENABLED === 'true',
      destination: process.env.LOG_ARCHIVE_DESTINATION || 'cold_storage',
      afterDays: parseInt(process.env.LOG_ARCHIVE_AFTER_DAYS || '30', 10),
    },
  },
  visualization: {
    kibanaUrl: process.env.ELK_KIBANA_URL || 'http://localhost:5601',
    username: process.env.ELK_USERNAME,
    password: process.env.ELK_PASSWORD,
    apiKey: process.env.ELK_API_KEY,
    spaceId: process.env.ELK_KIBANA_SPACE,
    defaultTimeRange: {
      from: process.env.ELK_DEFAULT_TIME_FROM || 'now-24h',
      to: process.env.ELK_DEFAULT_TIME_TO || 'now',
    },
    refreshInterval: process.env.ELK_REFRESH_INTERVAL || '30s',
  },
})

// Set up log interception to capture logs from our standard logger
loggingServices.setupInterception()

// Schedule log retention tasks to run daily
if (process.env.LOG_RETENTION_ENABLED === 'true') {
  loggingServices.scheduleRetention()
}

// Middleware that handles request tracking, logging, and error monitoring
export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context

  // Start performance transaction for this request
  let transaction
  if (isSentryInitialized) {
    const url = new URL(request.url)
    const transactionName = `${request.method} ${url.pathname}`
    transaction = sentry.startTransaction(transactionName, 'http.server')

    // Add basic request data as transaction tags
    sentry.setTag('http.method', request.method)
    sentry.setTag('http.url', url.pathname)

    // Add user agent info
    const userAgent = request.headers.get('user-agent')
    if (userAgent) {
      sentry.setTag('http.user_agent', userAgent.substring(0, 256))
    }
  }

  try {
    // Apply logger middleware first
    const loggerResponse = await next()

    // Add response info to transaction
    if (transaction && loggerResponse) {
      sentry.setTag('http.status_code', loggerResponse.status.toString())
      transaction.setHttpStatus(loggerResponse.status)
      transaction.finish()
    }

    // Ensure we always return a Response
    return loggerResponse
  } catch (error) {
    // Capture any unhandled errors
    if (isSentryInitialized) {
      sentry.captureError(error instanceof Error ? error : String(error), {
        request: {
          url: request.url,
          method: request.method,
          headers: Object.fromEntries(request.headers.entries()),
        },
      })

      // Finish transaction with error status
      if (transaction) {
        transaction.setStatus('internal_error')
        transaction.finish()
      }
    }

    // Re-throw the error so Astro can handle it
    throw error
  }
})
