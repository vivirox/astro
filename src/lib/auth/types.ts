import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

export type User = SupabaseUser;
export type Session = SupabaseSession;

export interface SessionData {
  user: User;
  session: Session;
}

export interface AuthContext {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
} 