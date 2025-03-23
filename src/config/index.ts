/**
 * Configuration module exports
 *
 * This file exports all configuration modules for easier imports
 * throughout the application.
 */

// Environment variables configuration
import { config as envConfig, type Env } from './env.config'
export { envConfig, type Env }

// Supabase configuration
import supabaseConfig from './supabase.config'
export { supabaseConfig }

// Deployment configuration
import deploymentConfig from './deployment.config'
export { deploymentConfig }

// Rate limit configuration
import rateLimitConfig, { type RateLimitOptions } from './rate-limit.config'
export { rateLimitConfig, type RateLimitOptions }

// Authentication configuration
import {
  authConfig,
  type AuthConfig,
  type AuthRole,
  hasRolePrivilege,
} from './auth.config'
export { authConfig, type AuthConfig, type AuthRole, hasRolePrivilege }

// Default export for all configurations
export default {
  env: envConfig,
  supabase: supabaseConfig,
  deployment: deploymentConfig,
  rateLimit: rateLimitConfig,
  auth: authConfig,
}
