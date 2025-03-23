// Re-export session functions
export { getSession, createSession, endSession } from './session'
export type { SessionData } from './session'

// Export authentication types and middleware
export * from './types'
export * from './middleware'
