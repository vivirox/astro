/**
 * Configuration module exports
 *
 * This file exports all configuration modules for easier imports
 * throughout the application.
 */

import type { AuthConfig, AuthRole } from './auth.config'
import type { Env } from './env.config'

import type { RateLimitOptions } from './rate-limit.config'

// Authentication configuration
import { authConfig, hasRolePrivilege } from './auth.config'

// Deployment configuration
import deploymentConfig from './deployment.config'
// Environment variables configuration
import { config as envConfig } from './env.config'
// Rate limit configuration
import rateLimitConfig from './rate-limit.config'

// Supabase configuration
import supabaseConfig from './supabase.config'

export { type Env, envConfig }
export { supabaseConfig }
export { deploymentConfig }
export { rateLimitConfig, type RateLimitOptions }
export { authConfig, type AuthConfig, type AuthRole, hasRolePrivilege }

// Default export for all configurations
export default {
  env: envConfig,
  supabase: supabaseConfig,
  deployment: deploymentConfig,
  rateLimit: rateLimitConfig,
  auth: authConfig,
}
