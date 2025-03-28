#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 *
 * This script validates that all required environment variables are present
 * when deploying to production environments.
 */

// Environment checks
const isProduction = process.env.NODE_ENV === 'production'
const isBuildStep =
  process.env.VERCEL_ENV === 'production' || process.env.NETLIFY === 'true'

// Define required environment variables
const requiredVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  // Add other required variables here
]

try {
  // Check for missing variables
  const missingVars = requiredVars.filter((varName) => !process.env[varName])

  // Production environment handling
  if (isProduction && isBuildStep) {
    // If there are missing variables in production, fail the build
    if (missingVars.length > 0) {
      console.error(
        '\x1b[31m%s\x1b[0m',
        '❌ ERROR: Missing required environment variables in production build:',
      )
      missingVars.forEach((varName) => {
        console.error(`   - ${varName}`)
      })
      console.error(
        '\nPlease make sure these variables are set in your deployment platform.\n',
      )
      process.exitCode = 1
    } else {
      console.log(
        '\x1b[32m%s\x1b[0m',
        '✅ All required environment variables are present.',
      )
    }
  } else {
    // Development environment - just warn about missing vars
    if (missingVars.length > 0) {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        '⚠️  Warning: Some environment variables are missing in development:',
      )
      missingVars.forEach((varName) => {
        console.warn(`   - ${varName}`)
      })
      console.warn(
        '\nMock services will be used for missing credentials in development.\n',
      )
    } else {
      console.log(
        '\x1b[32m%s\x1b[0m',
        '✅ All environment variables are present.',
      )
    }
  }
} catch (error) {
  console.error('Error validating environment variables:', error)
  process.exitCode = 1
}
