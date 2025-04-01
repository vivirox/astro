import { defineConfig } from 'convex/server'
import { v } from 'convex/values'

/**
 * Convex deployment configuration
 * Defines settings for different deployment environments
 */
export default defineConfig({
  // Environment-specific configuration
  environments: {
    // Production environment settings
    production: {
      // Custom domain configuration
      customDomain: v.optional(v.string()),

      // Rate limiting settings
      rateLimiting: {
        enabled: true,
        maxRequestsPerMinute: 1000,
        maxConcurrentRequests: 100,
      },

      // Caching configuration
      caching: {
        enabled: true,
        maxAge: 3600, // 1 hour
        staleWhileRevalidate: 300, // 5 minutes
      },

      // Security settings
      security: {
        enforceHttps: true,
        corsOrigins: [
          'https://app.yourdomain.com',
          'https://api.yourdomain.com',
          'https://*.yourdomain.com',
        ],
      },
    },

    // Development environment settings
    development: {
      rateLimiting: {
        enabled: false,
      },
      caching: {
        enabled: false,
      },
      security: {
        enforceHttps: false,
        corsOrigins: [
          'http://localhost:3000',
          'http://localhost:8080',
          'http://localhost:4321',
        ],
      },
    },
  },

  // Global settings
  global: {
    // Function timeout in milliseconds
    functionTimeout: 30000,

    // Maximum database query time
    maxQueryTime: 10000,

    // Maximum mutation time
    maxMutationTime: 20000,

    // Maximum action time
    maxActionTime: 60000,

    // Database settings
    database: {
      maxTransactionRetries: 3,
      maxConcurrentTransactions: 100,
    },
  },
})
