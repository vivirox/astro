import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.config'

// Define types for Supabase
export type SupabaseClient = ReturnType<typeof createClient>

// Default values for development (will be overridden by actual env vars if present)
const FALLBACK_SUPABASE_URL = 'https://example.supabase.co'
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example'

// Get Supabase URL and key with fallbacks
const supabaseUrl = env?.SUPABASE_URL || FALLBACK_SUPABASE_URL
const supabaseAnonKey = env?.SUPABASE_ANON_KEY || FALLBACK_ANON_KEY
const supabaseServiceRole = env?.SUPABASE_SERVICE_ROLE_KEY

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Create an admin client with service role (for server-side only!)
export const supabaseAdmin = supabaseServiceRole
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

// Create a server client (from headers)
export const createServerClient = (headers: Headers) => {
  const cookies = headers.get('cookie') || ''

  return createClient(supabaseUrl, supabaseAnonKey, {
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
}
