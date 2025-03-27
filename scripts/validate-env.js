#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 *
 * This script validates that all required environment variables are present
 * when deploying to production environments.
 */

// Production environment check
const isProduction = process.env.NODE_ENV === 'production'
const isBuildStep =
  process.env.VERCEL_ENV === 'production' || process.env.NETLIFY === 'true'

// If not in production build, exit silently
if (!isProduction || !isBuildStep) {
  console.log(
    'Not in production build environment, skipping environment validation.',
  )
  process.exit(0)
}

// Define required environment variables
const requiredVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  // Add other required variables here
]

// Check for missing variables
const missingVars = requiredVars.filter((varName) => !process.env[varName])

// If there are missing variables, fail the build
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
  process.exit(1) // Exit with error code
} else {
  console.log(
    '\x1b[32m%s\x1b[0m',
    '✅ All required environment variables are present.',
  )
  process.exit(0)
}
