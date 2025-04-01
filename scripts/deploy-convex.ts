#!/usr/bin/env ts-node

import { execSync } from 'child_process'
import { config } from '../src/config/env.config'

async function deployConvex() {
  try {
    console.log('🚀 Starting Convex deployment...')

    // Verify environment
    if (!process.env.CONVEX_DEPLOY_KEY) {
      throw new Error('CONVEX_DEPLOY_KEY is required for deployment')
    }

    // Set deployment environment
    const env = config.isProduction() ? 'production' : 'development'
    console.log(`📦 Deploying to ${env} environment...`)

    // Deploy to Convex
    execSync(`npx convex deploy ${env}`, { stdio: 'inherit' })

    console.log('✅ Convex deployment completed successfully!')
  } catch (error) {
    console.error('❌ Deployment failed:', error)
    process.exit(1)
  }
}

deployConvex().catch(console.error)
