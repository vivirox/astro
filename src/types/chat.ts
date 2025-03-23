/**
 * Chat message types for the therapy system
 */

/**
 * Base chat message interface
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
  encrypted?: boolean
  verified?: boolean
  verificationToken?: string
  isError?: boolean
}

/**
 * Chat thread containing multiple messages
 */
export interface ChatThread {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  metadata?: {
    scenario?: string
    securityLevel?: 'standard' | 'hipaa' | 'maximum'
    encryptionEnabled?: boolean
    encryptionMode?: string
    clientType?: string
  }
}

/**
 * Chat session containing multiple threads
 */
export interface ChatSession {
  id: string
  userId: string
  threads: ChatThread[]
  activeThreadId: string
  createdAt: number
  updatedAt: number
}
