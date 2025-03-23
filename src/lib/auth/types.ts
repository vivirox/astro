import type {
  Session as SupabaseSession,
  User as SupabaseUser,
} from '@supabase/supabase-js'

export type User = SupabaseUser
export type Session = SupabaseSession

export interface SessionData {
  sessionId: string
  userId: string
  startTime: number
  expiresAt: number
  securityLevel: string
  metadata?: Record<string, unknown>
}

export interface AuthContext {
  session?: unknown
  securityVerification?: SecurityVerificationResult
  hipaaCompliance?: HIPAAComplianceInfo
}

export interface SecurityVerificationResult {
  isValid: boolean
  details: {
    timestamp: number
    verificationHash: string
  }
}

export interface HIPAAComplianceInfo {
  encryptionEnabled: boolean
  auditEnabled: boolean
  timestamp: number
}

export interface TokenData {
  token: string
  expires: number
}

export interface AuthenticationResult {
  success: boolean
  message?: string
  token?: TokenData
  session?: SessionData
}
