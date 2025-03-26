import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.config'

// Define types for Supabase
export type SupabaseClient = ReturnType<typeof createClient>

// Default values for development (will be overridden by actual env vars if present)
const FALLBACK_SUPABASE_URL = 'https://example.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example'

// Get Supabase URL and key with fallbacks
const supabaseUrl =
  env?.SUPABASE_URL ||
  (typeof window === 'undefined'
    ? process.env.PUBLIC_SUPABASE_URL
    : undefined) ||
  FALLBACK_SUPABASE_URL
const supabaseAnonKey =
  env?.SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined'
    ? process.env.PUBLIC_SUPABASE_ANON_KEY
    : undefined) ||
  FALLBACK_ANON_KEY
const supabaseServiceRole = env?.SUPABASE_SERVICE_ROLE_KEY

// Create mock Supabase client for builds without proper credentials
function createMockClient() {
  console.warn(
    'Using mock Supabase client. This should not be used in production.',
  )
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      select: () => ({
        eq: () => ({
          order: () => ({
            range: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  }
}

// Check if we have valid Supabase URL and key
const hasValidCredentials =
  supabaseUrl &&
  supabaseUrl !== FALLBACK_SUPABASE_URL &&
  supabaseAnonKey &&
  supabaseAnonKey !== FALLBACK_ANON_KEY

// Create a Supabase client
export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : (createMockClient() as any)

// Create an admin client with service role (for server-side only!)
export const supabaseAdmin =
  hasValidCredentials && supabaseServiceRole
    ? createClient(supabaseUrl, supabaseServiceRole, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : (createMockClient() as any)

// Create a server client (from headers)
export function createServerClient(headers: Headers) {
  const cookies = headers.get('cookie') || ''

  return hasValidCredentials
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            cookie: cookies,
          },
        },
      })
    : (createMockClient() as any)
}
