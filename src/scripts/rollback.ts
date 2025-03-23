#!/usr/bin/env node

/**
 * Deployment Rollback Script
 *
 * This script performs an automatic rollback when a deployment fails.
 * It restores the previous stable version and notifies the team.
 */

import { spawnSync } from 'child_process'
import { parseArgs } from 'node:util'
import fetch from 'node-fetch'

interface RollbackOptions {
  environment: string
  notify: boolean
  version?: string
}

interface DeploymentInfo {
  url: string
  state: string
  meta?: {
    rollback?: boolean
  }
  // Add other deployment fields as needed
  deploymentId?: string
  createdAt?: string
  target?: string
}

async function sendNotification(message: string, environment: string) {
  try {
    console.log(`Sending notification for ${environment} rollback...`)

    // Send to Slack
    await fetch(process.env.SLACK_WEBHOOK_URL || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *ROLLBACK ALERT* 🚨\n${message}\nEnvironment: ${environment}`,
      }),
    })

    // Send to email
    if (process.env.EMAIL_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EMAIL_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'alerts@gradiant.health',
          to: 'devops@gradiant.health',
          subject: `🚨 Rollback Alert: ${environment}`,
          html: `<p><strong>ROLLBACK ALERT</strong></p><p>${message}</p><p>Environment: ${environment}</p>`,
        }),
      })
    }

    console.log('✓ Notifications sent')
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

async function getLastStableVersion(environment: string): Promise<string> {
  try {
    // Query deployment history to find last stable version
    const result = spawnSync('pnpm', [
      'vercel',
      'list',
      '--environment',
      environment,
      '--limit',
      '10',
      '--json',
    ])

    if (result.status !== 0) {
      throw new Error(
        `Failed to get deployment history: ${result.stderr.toString()}`
      )
    }

    const deployments = JSON.parse(result.stdout.toString()) as DeploymentInfo[]

    // Find last successful deployment (not the current failing one)
    const lastStable = deployments.find(
      (d) => d.state === 'READY' && !d.meta?.rollback
    )

    if (!lastStable) {
      throw new Error('No stable version found in recent deployments')
    }

    return lastStable.url
  } catch (error) {
    console.error('Error finding last stable version:', error)
    return 'latest-stable'
  }
}

async function performRollback(options: RollbackOptions) {
  try {
    console.log(`=== Initiating Rollback for ${options.environment} ===`)

    // Get version to roll back to
    const version =
      options.version || (await getLastStableVersion(options.environment))
    console.log(`Target rollback version: ${version}`)

    // Perform the rollback
    console.log('\nExecuting rollback...')
    const rollback = spawnSync('pnpm', [
      'vercel',
      'rollback',
      '--environment',
      options.environment,
      '--yes',
    ])

    if (rollback.status !== 0) {
      throw new Error(`Rollback failed: ${rollback.stderr.toString()}`)
    }

    console.log('✓ Rollback completed successfully')

    // Run verification to ensure rollback is healthy
    console.log('\nVerifying rollback health...')
    const verify = spawnSync('pnpm', [
      'tsx',
      'src/scripts/verify-deployment.ts',
    ])

    if (verify.status !== 0) {
      console.warn('Rollback verification warning: Verification checks failed')
      console.warn(verify.stderr.toString())

      if (options.notify) {
        await sendNotification(
          'Rollback completed but verification checks failed. Manual intervention may be required.',
          options.environment
        )
      }
    } else {
      console.log('✓ Rollback verification successful')

      if (options.notify) {
        await sendNotification(
          `Deployment rollback completed successfully to version ${version}.`,
          options.environment
        )
      }
    }

    return true
  } catch (error) {
    console.error('\n❌ Rollback failed:', error)

    if (options.notify) {
      await sendNotification(
        `CRITICAL: Automatic rollback failed. Manual intervention required. Error: ${error}`,
        options.environment
      )
    }

    return false
  }
}

async function main() {
  try {
    // Parse command line arguments
    const { values } = parseArgs({
      options: {
        environment: { type: 'string', short: 'e', default: 'production' },
        notify: { type: 'boolean', short: 'n', default: false },
        version: { type: 'string', short: 'v' },
      },
    })

    const options: RollbackOptions = {
      environment: values.environment as string,
      notify: values.notify as boolean,
      version: values.version as string | undefined,
    }

    const success = await performRollback(options)
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('Unhandled error:', error)
    process.exit(1)
  }
}

// Execute main function
main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
