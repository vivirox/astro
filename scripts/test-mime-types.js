#!/usr/bin/env node

/**
 * Script to test MIME types for static assets
 * Used to verify that content types are correctly set
 */

const fetch = require('node-fetch')
const path = require('path')
const fs = require('fs')
const chalk = require('chalk') // Optional, for colored output

// URL to test against (when available)
const baseUrl = process.env.TEST_URL || 'https://gradiantascent.xyz'

// Assets to test
const assetsToTest = [
  { path: '/assets/_uno.CE0VOCPA.css', expectedType: 'text/css' },
  { path: '/assets/base.eJkTMUBs.css', expectedType: 'text/css' },
  { path: '/assets/main.BcEGgCZL.css', expectedType: 'text/css' },
  { path: '/assets/prose.BRalDdoB.css', expectedType: 'text/css' },
  { path: '/assets/markdown.diaXtiq9.css', expectedType: 'text/css' },
  { path: '/icon-192.png', expectedType: 'image/png' },
]

async function testMimeTypes() {
  console.log('Testing MIME types for static assets...')
  console.log(`Base URL: ${baseUrl}`)
  console.log('-------------------------------------------')

  let failCount = 0
  let successCount = 0

  for (const asset of assetsToTest) {
    try {
      const url = new URL(asset.path, baseUrl)
      const response = await fetch(url.toString(), { method: 'HEAD' })
      const contentType = response.headers.get('content-type')

      const status = response.status
      const isSuccess = status === 200
      const typeMatches =
        contentType && contentType.includes(asset.expectedType)

      if (isSuccess && typeMatches) {
        console.log(chalk ? chalk.green(`✓ ${asset.path}`) : `✓ ${asset.path}`)
        console.log(`  Content-Type: ${contentType}`)
        successCount++
      } else {
        console.log(chalk ? chalk.red(`✗ ${asset.path}`) : `✗ ${asset.path}`)
        console.log(`  Status: ${status}`)
        console.log(`  Content-Type: ${contentType || 'none'}`)
        console.log(`  Expected Type: ${asset.expectedType}`)
        failCount++
      }
      console.log('-------------------------------------------')
    } catch (error) {
      console.log(chalk ? chalk.red(`✗ ${asset.path}`) : `✗ ${asset.path}`)
      console.log(`  Error: ${error.message}`)
      failCount++
      console.log('-------------------------------------------')
    }
  }

  console.log(`Results: ${successCount} passed, ${failCount} failed`)

  if (failCount > 0) {
    console.log(
      chalk
        ? chalk.yellow('Warning: Some assets failed the MIME type test')
        : 'Warning: Some assets failed the MIME type test',
    )
    console.log(
      'Ensure your middleware and server configurations are correctly set up.',
    )
  } else {
    console.log(
      chalk
        ? chalk.green('Success: All assets have correct MIME types')
        : 'Success: All assets have correct MIME types',
    )
  }
}

testMimeTypes().catch((error) => {
  console.error('Error running tests:', error)
  process.exit(1)
})
