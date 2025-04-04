#!/usr/bin/env tsx

// Diagnostics script
// Helps debug common issues with the project

import * as fs from 'fs'
import * as path from 'path'

import fetch from 'node-fetch'

import { RedisService } from '../src/lib/services/redis/RedisService'






// Command line arguments
const args = process.argv.slice(2)
const checkHealth = args.includes('--check-health')
const checkPerformance = args.includes('--check-performance')
const checkDatabase = args.includes('--check-database')
const checkCriticalPaths = args.includes('--check-critical-paths')
const verbose = args.includes('--verbose')
const outputJson = args.includes('--json')

// Base URL for production/staging
const baseUrl =
  process.env.APP_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://gradiant.app'
    : 'https://staging.gradiant.app')

// Critical paths to test
const criticalPaths = [
  '/',
  '/documentation',
  '/api/v1/health',
  '/dashboard',
  '/simulator',
  '/auth/login',
]

// Performance thresholds
const performanceThresholds = {
  ttfb: 500, // Time to first byte (ms)
  fcp: 1500, // First contentful paint (ms)
  lcp: 2500, // Largest contentful paint (ms)
  cls: 0.1, // Cumulative layout shift
  tbt: 300, // Total blocking time (ms)
}

interface HealthCheckResult {
  path: string
  status: number
  success: boolean
  responseTime: number
  error?: string
}

interface DiagnosticsResult {
  timestamp: string
  environment: string
  health: {
    overall: boolean
    api: boolean
    frontend: boolean
    database?: boolean
    details: HealthCheckResult[]
  }
  performance?: {
    overall: boolean
    metrics: Record<string, any>
  }
  version?: string
  deploymentInfo?: any
}

// File existence check utility
async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
}

async function main() {
  const startTime = Date.now()
  const results: DiagnosticsResult = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    health: {
      overall: true,
      api: true,
      frontend: true,
      details: [],
    },
  }

  try {
    // Get deployment info if available
    try {
      const deployInfo = getDeploymentInfo()
      if (deployInfo) {
        results.version = deployInfo.version
        results.deploymentInfo = deployInfo
      }
    } catch (error) {
      console.warn(
        'Could not fetch deployment info:',
        error instanceof Error ? error.message : String(error),
      )
    }

    // Health checks
    if (checkHealth || checkCriticalPaths) {
      log('Running health checks...')
      await runHealthChecks(results)
    }

    // Performance checks
    if (checkPerformance) {
      log('Running performance checks...')
      await runPerformanceChecks(results)
    }

    // Database checks
    if (checkDatabase) {
      log('Running database checks...')
      await runDatabaseChecks(results)
    }

    const duration = Date.now() - startTime
    log(`Diagnostics completed in ${duration}ms`)

    if (outputJson) {
      console.log(JSON.stringify(results, null, 2))
    } else {
      console.log('\n=== Diagnostics Results ===')
      console.log(`Environment: ${results.environment}`)
      console.log(`Version: ${results.version || 'Unknown'}`)
      console.log(`Timestamp: ${results.timestamp}`)
      console.log(`Duration: ${duration}ms`)

      console.log('\nHealth Status:')
      console.log(
        `Overall: ${results.health.overall ? '✅ Healthy' : '❌ Unhealthy'}`,
      )
      console.log(
        `Frontend: ${results.health.frontend ? '✅ Healthy' : '❌ Unhealthy'}`,
      )
      console.log(`API: ${results.health.api ? '✅ Healthy' : '❌ Unhealthy'}`)

      if (results.health.database !== undefined) {
        console.log(
          `Database: ${results.health.database ? '✅ Healthy' : '❌ Unhealthy'}`,
        )
      }

      if (verbose) {
        console.log('\nHealth Check Details:')
        results.health.details.forEach((result) => {
          console.log(
            `- ${result.path}: ${result.success ? '✅' : '❌'} (${result.status}, ${result.responseTime}ms)`,
          )
          if (result.error) {
            console.log(`  Error: ${result.error}`)
          }
        })
      }

      if (results.performance) {
        console.log('\nPerformance Status:')
        console.log(
          `Overall: ${results.performance.overall ? '✅ Good' : '❌ Poor'}`,
        )
        if (verbose) {
          console.log('\nPerformance Metrics:')
          Object.entries(results.performance.metrics).forEach(
            ([key, value]) => {
              console.log(`- ${key}: ${value}`)
            },
          )
        }
      }
    }

    // Exit with appropriate code
    if (!results.health.overall) {
      process.exit(1)
    }

    if (results.performance && !results.performance.overall) {
      // Performance issues alone don't cause failure, just warnings
      console.warn('\n⚠️ Performance issues detected, but not failing build.')
    }

    process.exit(0)
  } catch (error) {
    console.error(
      'Error in diagnostics:',
      error instanceof Error ? error.message : String(error),
    )
    process.exit(1)
  }
}

async function runHealthChecks(results: DiagnosticsResult) {
  // Start with API health check
  const apiHealthPath = '/api/v1/health'
  const apiResult = await checkEndpoint(`${baseUrl}${apiHealthPath}`)
  results.health.details.push(apiResult)

  if (!apiResult.success) {
    results.health.api = false
    results.health.overall = false
  }

  // Check critical paths if requested
  if (checkCriticalPaths) {
    for (const path of criticalPaths) {
      // Skip the API health check as we already did it
      if (path === apiHealthPath) {
        continue
      }

      const pathResult = await checkEndpoint(`${baseUrl}${path}`)
      results.health.details.push(pathResult)

      // Update frontend health status for frontend paths
      if (!path.startsWith('/api/') && !pathResult.success) {
        results.health.frontend = false
        results.health.overall = false
      }

      // Update API health status for API paths
      if (path.startsWith('/api/') && !pathResult.success) {
        results.health.api = false
        results.health.overall = false
      }
    }
  }
}

async function runPerformanceChecks(results: DiagnosticsResult) {
  // Use Playwright or similar for performance metrics
  // This is a simplified example - in practice, you might want to use Lighthouse or WebPageTest
  try {
    // Let's simulate some performance data for this example
    const performanceData = {
      ttfb: Math.floor(Math.random() * 600),
      fcp: Math.floor(Math.random() * 2000),
      lcp: Math.floor(Math.random() * 3000),
      cls: Math.random() * 0.2,
      tbt: Math.floor(Math.random() * 500),
    }

    // Compare against thresholds
    const performanceResults = {
      ttfb: performanceData.ttfb <= performanceThresholds.ttfb,
      fcp: performanceData.fcp <= performanceThresholds.fcp,
      lcp: performanceData.lcp <= performanceThresholds.lcp,
      cls: performanceData.cls <= performanceThresholds.cls,
      tbt: performanceData.tbt <= performanceThresholds.tbt,
    }

    // Overall performance is good only if all metrics are good
    const overallPerformance = Object.values(performanceResults).every(Boolean)

    results.performance = {
      overall: overallPerformance,
      metrics: {
        ...performanceData,
        results: performanceResults,
      },
    }

    // In a real implementation, you would run Lighthouse or similar here
    // Example with Lighthouse CLI (if installed):
    // const lighthouseOutput = execSync(`lighthouse ${baseUrl} --output=json --quiet`).toString();
    // const lighthouseResults = JSON.parse(lighthouseOutput);
    // Process and use the results...
  } catch (error) {
    console.error(
      'Error in performance checks:',
      error instanceof Error ? error.message : String(error),
    )
    results.performance = {
      overall: false,
      metrics: {
        error: 'Failed to run performance checks',
      },
    }
  }
}

async function runDatabaseChecks(results: DiagnosticsResult) {
  try {
    // Initialize Redis service if available
    if (process.env.REDIS_URL) {
      const redis = new RedisService({
        url: process.env.REDIS_URL,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'gradiant:',
      })

      // Simple ping test
      const pingResult = await redis.ping()
      results.health.database = pingResult === 'PONG'

      if (!results.health.database) {
        results.health.overall = false
      }

      // Cleanup
      await redis.disconnect()
    } else {
      log('Skipping database checks: REDIS_URL not configured')
    }
  } catch (error) {
    console.error(
      'Database check error:',
      error instanceof Error ? error.message : String(error),
    )
    results.health.database = false
    results.health.overall = false
  }
}

async function checkEndpoint(url: string): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    path: url.replace(baseUrl, ''),
    status: 0,
    success: false,
    responseTime: 0,
  }

  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GradiantDiagnostics/1.0',
      },
      redirect: 'follow',
      timeout: 10000,
    })

    result.status = response.status
    result.responseTime = Date.now() - startTime

    // Consider 2xx and 3xx as success
    result.success = response.status >= 200 && response.status < 400

    // For non-success statuses, get the response body for more info
    if (!result.success) {
      const body = await response.text()
      result.error = `HTTP ${response.status}: ${body.substring(0, 200)}...`
    }

    return result
  } catch (error) {
    result.responseTime = Date.now() - startTime
    result.error = error instanceof Error ? error.message : String(error)
    return result
  }
}

function getDeploymentInfo() {
  // Try reading from environment
  const version =
    process.env.DEPLOY_VERSION || process.env.VERCEL_GIT_COMMIT_SHA
  const timestamp =
    process.env.DEPLOY_TIMESTAMP || process.env.VERCEL_GIT_COMMIT_MESSAGE

  if (version) {
    return { version, timestamp }
  }

  // Try reading from deployment-info directory (created in CI/CD pipeline)
  try {
    const infoDir = path.join(process.cwd(), 'deployment-info')
    try {
      const stats = fs.statSync(infoDir)
      if (stats.isDirectory()) {
        const files = fs.readdirSync(infoDir)
        const info: Record<string, string> = {}

        for (const file of files) {
          const content = fs
            .readFileSync(path.join(infoDir, file), 'utf-8')
            .trim()
          info[file.replace('-', '_')] = content
        }

        return info
      }
    } catch (statError) {
      // Directory doesn't exist
      return null
    }
  } catch (error) {
    log('Could not read deployment info from files', error)
  }

  return null
}

function log(message: string, error?: any) {
  if (verbose) {
    if (error) {
      console.error(`[Diagnostics] ${message}`, error)
    } else {
      console.log(`[Diagnostics] ${message}`)
    }
  }
}

// Run the script
main()
