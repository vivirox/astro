import { defineConfig } from 'convex/server'
import { v } from 'convex/values'

export default defineConfig({
  monitoring: {
    // Enable logging for all environments
    logging: {
      // Log all function executions
      functions: {
        enabled: true,
        // Include function arguments in logs
        includeArgs: true,
        // Include function return values in logs (disable in production for sensitive data)
        includeReturnValue: process.env.NODE_ENV !== 'production',
        // Log slow functions (taking more than 1s)
        slowFunctionThresholdMs: 1000,
      },
      // Database operation logging
      database: {
        enabled: true,
        // Log queries taking more than 500ms
        slowQueryThresholdMs: 500,
        // Include query plans in logs
        includeQueryPlans: true,
      },
      // HTTP endpoint logging
      http: {
        enabled: true,
        // Include request bodies in logs (disable in production for sensitive data)
        includeBody: process.env.NODE_ENV !== 'production',
        // Include response bodies in logs (disable in production for sensitive data)
        includeResponse: process.env.NODE_ENV !== 'production',
      },
    },
    // Metrics configuration
    metrics: {
      enabled: true,
      // Collect custom metrics
      custom: {
        enabled: true,
        // Maximum number of custom metrics
        maxMetrics: 100,
      },
    },
    // Alert configuration
    alerts: {
      enabled: true,
      rules: [
        {
          name: 'High Error Rate',
          condition: {
            metric: 'function.error.rate',
            threshold: 0.05, // 5% error rate
            window: '5m',
          },
        },
        {
          name: 'Slow Queries',
          condition: {
            metric: 'database.query.duration.p95',
            threshold: 1000, // 1 second
            window: '5m',
          },
        },
        {
          name: 'High Memory Usage',
          condition: {
            metric: 'system.memory.usage',
            threshold: 0.9, // 90% usage
            window: '5m',
          },
        },
      ],
      // Notification channels (configure in Convex dashboard)
      notifications: {
        email: true,
        slack: true,
      },
    },
  },
})
