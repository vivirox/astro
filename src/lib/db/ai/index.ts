export * from './types' // Export the types
export * from './schema' // Export the schema definitions
export * from './repository' // Export the repository
export * from './initialize' // Export the initialization function

// Export a singleton instance of the repository
import { AIRepository } from './repository'
export const aiRepository = new AIRepository()
