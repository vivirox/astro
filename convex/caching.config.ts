import { defineConfig } from 'convex/server'


export default defineConfig({
  caching: {
    // Enable caching in production
    enabled: process.env.NODE_ENV === 'production',

    // Query result caching
    queries: {
      // Default TTL for query results
      defaultTtl: 3600, // 1 hour
      // Maximum TTL for any query
      maxTtl: 86400, // 24 hours
      // Stale-while-revalidate period
      staleWhileRevalidate: 300, // 5 minutes
    },

    // Document caching
    documents: {
      // Enable document-level caching
      enabled: true,
      // Default TTL for documents
      defaultTtl: 1800, // 30 minutes
      // Maximum documents to cache
      maxDocuments: 10000,
    },

    // Search index caching
    search: {
      enabled: true,
      // TTL for search results
      ttl: 900, // 15 minutes
      // Maximum search results to cache
      maxResults: 1000,
    },

    // Cache invalidation rules
    invalidation: {
      // Automatically invalidate on mutations
      autoInvalidateOnMutation: true,
      // Patterns for cache key generation
      keyPatterns: [
        // Cache by user ID
        'user:{userId}',
        // Cache by session ID
        'session:{sessionId}',
        // Cache search results
        'search:{query}:{type}',
      ],
    },

    // Cache storage configuration
    storage: {
      // Maximum cache size in MB
      maxSizeMb: 512,
      // Eviction policy
      evictionPolicy: 'lru', // Least Recently Used
    },

    // Cache monitoring
    monitoring: {
      enabled: true,
      // Report cache stats every 5 minutes
      reportingInterval: 300,
      // Alert on low hit rates
      alerts: {
        hitRateThreshold: 0.5, // Alert if hit rate drops below 50%
      },
    },
  },
})
