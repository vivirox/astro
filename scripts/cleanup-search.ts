#!/usr/bin/env tsx


import { } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import fs from 'fs'

/**
 * Script that completely disables pagefind and ensures flexsearch is used
 */

const DIST_DIR = path.join(process.cwd(), 'dist')
const CLIENT_DIR = path.join(DIST_DIR, 'client')
const VERCEL_OUTPUT = path.join(process.cwd(), '.vercel/output/static')
const PAGEFIND_DIR = path.join(VERCEL_OUTPUT, 'pagefind')

console.log('🔍 Running search cleanup and pagefind mitigation...')

// Check if FlexSearch was successful
const flexSearchIndex = path.join(CLIENT_DIR, '_search-index.js')
const flexSearchExists = fs.existsSync(flexSearchIndex)

console.log(
  flexSearchExists
    ? '✅ Search index was generated during build with FlexSearch'
    : '⚠️ FlexSearch index not found. Search may not work correctly.',
)

// Create pagefind dummy to prevent runtime errors
console.log('🧹 Checking Vercel output directory for pagefind artifacts...')

// Create directories if they don't exist
const createDirIfNeeded = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`📁 Created directory ${path.relative(process.cwd(), dir)}`)
  }
}

// Create Vercel output directory if it doesn't exist
if (fs.existsSync(VERCEL_OUTPUT)) {
  createDirIfNeeded(PAGEFIND_DIR)

  // Create dummy pagefind.js
  const pagefindJsPath = path.join(PAGEFIND_DIR, 'pagefind.js')
  const dummyPagfindJs = `
// Dummy pagefind implementation to prevent errors
window.pagefind = {
  init: () => Promise.resolve({
    search: () => Promise.resolve({ results: [] }),
    searchIndex: {},
    filters: {},
    empty: true,
    loading: false,
    error: null
  }),
  search: () => Promise.resolve({ results: [] }),
  filters: () => Promise.resolve([])
};
console.log("⚠️ Using dummy pagefind implementation. Search using FlexSearch instead.");
`

  fs.writeFileSync(pagefindJsPath, dummyPagfindJs)
  console.log('✅ Created dummy pagefind.js to prevent errors')

  // Create dummy ui.js
  const uiJsPath = path.join(PAGEFIND_DIR, 'ui.js')
  fs.writeFileSync(uiJsPath, '// Dummy pagefind UI')

  // Create dummy metadata.json
  const metadataPath = path.join(PAGEFIND_DIR, 'metadata.json')
  fs.writeFileSync(
    metadataPath,
    JSON.stringify({
      version: 'mock-version',
      pageCount: 0,
      filters: [],
    }),
  )
} else {
  console.log(
    '⚠️ Vercel output directory not found. Skipping pagefind mitigation.',
  )
}

console.log('✅ Search processing completed successfully')
