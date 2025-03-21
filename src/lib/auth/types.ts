import type {
  Session as SupabaseSession,
  User as SupabaseUser,
} from '@supabase/supabase-js'
import type { ZKVerificationResult } from './zkAuth'

export type User = SupabaseUser
export type Session = SupabaseSession

export interface SessionData {
  user: User
  session: Session
}

export interface AuthContext {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  zkVerification?: ZKVerificationResult
}
