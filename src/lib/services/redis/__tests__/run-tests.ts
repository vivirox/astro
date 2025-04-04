import { spawn } from 'node:child_process'
import { logger } from '../../../../utils/logger'

interface TestResult {
  suite: string
  duration: number
  passed: boolean
  error?: string
}

/**
 * Runs a test command and returns the result
 */
async function runTest(
  command: string,
  args: string[],
  options: {
    suite: string
    timeout?: number
  },
): Promise<TestResult> {
  const start = Date.now()

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      env: {
        ...process.env,
        FORCE_COLOR: 'true',
      },
    })

    let _output = ''
    let error = ''

    child.stdout.on('data', (data) => {
      _output += data.toString()
      process.stdout.write(data)
    })

    child.stderr.on('data', (data) => {
      error += data.toString()
      process.stderr.write(data)
    })

    const timer = options.timeout
      ? setTimeout(() => {
          child.kill()
          resolve({
            suite: options.suite,
            duration: Date.now() - start,
            passed: false,
            error: `Test timeout after ${options.timeout}ms`,
          })
        }, options.timeout)
      : null

    child.on('close', (code) => {
      if (timer) {
        clearTimeout(timer)
      }

      resolve({
        suite: options.suite,
        duration: Date.now() - start,
        passed: code === 0,
        error: code !== 0 ? error : undefined,
      })
    })
  })
}

/**
 * Main test runner function
 */
async function runTests() {
  logger.info('Starting Redis Service test suite')
  const results: TestResult[] = []
  const startTime = Date.now()

  try {
    // Run unit tests
    results.push(
      await runTest(
        'vitest',
        ['RedisService.test.ts', '--config', 'vitest.config.ts'],
        {
          suite: 'Unit Tests',
          timeout: 30000,
        },
      ),
    )

    // Run integration tests
    results.push(
      await runTest(
        'vitest',
        ['RedisService.integration.test.ts', '--config', 'vitest.config.ts'],
        {
          suite: 'Integration Tests',
          timeout: 60000,
        },
      ),
    )

    // Run performance tests
    results.push(
      await runTest(
        'vitest',
        ['RedisService.perf.test.ts', '--config', 'vitest.config.ts'],
        {
          suite: 'Performance Tests',
          timeout: 120000,
        },
      ),
    )

    // Generate coverage report
    await runTest(
      'vitest',
      ['run', '--coverage', '--config', 'vitest.config.ts'],
      {
        suite: 'Coverage Report',
        timeout: 30000,
      },
    )

    // Print results
    const totalDuration = Date.now() - startTime
    const passedTests = results.filter((r) => r.passed).length
    const failedTests = results.filter((r) => !r.passed).length

    logger.info('\nTest Results Summary:')
    logger.info('====================')
    logger.info(`Total Duration: ${totalDuration}ms`)
    logger.info(`Tests Passed: ${passedTests}`)
    logger.info(`Tests Failed: ${failedTests}`)
    logger.info('\nDetailed Results:')

    results.forEach((result) => {
      logger.info(`\n${result.suite}:`)
      logger.info(`  Duration: ${result.duration}ms`)
      logger.info(`  Status: ${result.passed ? 'PASSED' : 'FAILED'}`)
      if (result.error) {
        logger.error(`  Error: ${result.error}`)
      }
    })

    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0)
  } catch (error) {
    logger.error('Test execution failed:', error)
    process.exit(1)
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
}
