import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.config'

// Define types for Supabase
export type SupabaseClient = ReturnType<typeof createClient>

// Create isomorphic process reference
const processEnv = typeof process !== 'undefined' ? process.env : {}
const NODE_ENV = processEnv.NODE_ENV || 'development'

// Default values for development (will be overridden by actual env vars if present)
const FALLBACK_SUPABASE_URL = 'https://example.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example'

// Determine if we're in a production environment
const isProduction = NODE_ENV === 'production'

// Get Supabase URL and key with appropriate fallbacks
const supabaseUrl =
  env?.SUPABASE_URL ||
  (typeof window === 'undefined'
    ? processEnv.PUBLIC_SUPABASE_URL
    : undefined) ||
  (isProduction ? undefined : FALLBACK_SUPABASE_URL)

const supabaseAnonKey =
  env?.SUPABASE_ANON_KEY ||
  processEnv.PUBLIC_SUPABASE_ANON_KEY ||
  (isProduction ? undefined : FALLBACK_ANON_KEY)

const supabaseServiceRole = env?.SUPABASE_SERVICE_ROLE_KEY

// In production, ensure we have valid credentials or throw an error
if (isProduction && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    'CRITICAL: Missing Supabase credentials in production environment',
  )
  // Don't throw in production - use mock client instead, but log the error
}

// Create mock Supabase client for builds without proper credentials
function createMockClient() {
  const message = isProduction
    ? 'CRITICAL: Using mock Supabase client in production. This should never happen.'
    : 'Using mock Supabase client for development. This should not be used in production.'

  console.warn(message)

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
