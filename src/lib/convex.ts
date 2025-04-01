/**
 * Mock Convex client for development
 * This file provides mock implementations for Convex functions when
 * running in development mode without a real Convex deployment.
 */

// Return a mock client that provides fake data for metrics
export function getConvexClient() {
  return {
    query: (queryFunction: any) => {
      // Extract the function name from the query path
      const functionPath = queryFunction.path || ''
      const functionName = functionPath.split('.').pop()

      // Return mock data based on the function being called
      switch (functionName) {
        case 'getActiveUsers':
          return 145
        case 'getActiveSessions':
          return 78
        case 'getAverageResponseTime':
          return 245 // ms
        case 'getSystemLoad':
          return 0.68
        case 'getStorageUsed':
          return 2.4 // GB
        case 'getMessagesSent':
          return 15782
        case 'getActiveSecurityLevel':
          return 'HIGH'
        case 'getSecurityEvents':
          return [
            {
              timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
              type: 'login',
              severity: 'medium',
              metadata: {
                details: 'Failed login attempt',
              },
            },
            {
              timestamp: Date.now() - 1000 * 60 * 30, // 30 mins ago
              type: 'access',
              severity: 'high',
              metadata: {
                details: 'Unauthorized access attempt',
              },
            },
          ]
        case 'getEventStats':
          return {
            total: 156,
            last24h: 12,
            last7d: 78,
            bySeverity: {
              critical: 2,
              high: 15,
              medium: 45,
              low: 94,
            },
          }
        default:
          console.warn(
            `Mock data not provided for Convex function: ${functionPath}`,
          )
          return null
      }
    },
    mutation: (mutationFunction: any) => {
      console.log(`Mock mutation called: ${mutationFunction.path}`)
      return Promise.resolve({ success: true, id: 'mock-id-' + Date.now() })
    },
  }
}

// When environment variables are properly set up, this function would
// initialize a real Convex client using the provided credentials
export function initializeConvexClient() {
  // This would normally initialize the real Convex client
  // but for now we just return the mock implementation
  return getConvexClient()
}

// Export the mock client for use in components
export const useConvexClient = getConvexClient
