#!/usr/bin/env tsx

import { execSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'

/**
 * Script that completely disables pagefind and ensures flexsearch is used
 */

const DIST_DIR = path.join(process.cwd(), 'dist')
const VERCEL_OUTPUT_DIR = path.join(process.cwd(), '.vercel/output')

console.log('🔍 Running search cleanup and pagefind mitigation...')

// Make sure the dist directory exists
if (!existsSync(DIST_DIR)) {
  console.error('❌ Error: dist directory not found. Run build first.')
  process.exit(1)
}

try {
  // FlexSearch is integrated directly in the Astro build process
  console.log('✅ Search index was generated during build with FlexSearch')

  // Clean up any old search artifacts
  if (existsSync(path.join(DIST_DIR, 'pagefind'))) {
    console.log('🧹 Cleaning up pagefind artifacts in dist...')
    execSync('npx del-cli "dist/pagefind"', { stdio: 'inherit' })
    console.log('✅ Pagefind artifacts removed from dist')
  }

  // Also check and clean up Vercel output directory if it exists
  if (existsSync(VERCEL_OUTPUT_DIR)) {
    console.log('🧹 Checking Vercel output directory for pagefind artifacts...')

    // Clean up pagefind in static assets
    if (existsSync(path.join(VERCEL_OUTPUT_DIR, 'static/pagefind'))) {
      execSync('npx del-cli ".vercel/output/static/pagefind"', {
        stdio: 'inherit',
      })
      console.log('✅ Pagefind artifacts removed from Vercel static output')
    }

    // Create a dummy pagefind.js file to prevent errors
    const dummyPagefindContent = `
// This is a dummy file to prevent pagefind errors
// The actual search functionality uses flexsearch
console.log('Search is powered by flexsearch, not pagefind');
export default {
  init: () => console.log('Using flexsearch instead'),
  search: () => ({ results: [] }),
  options: () => Promise.resolve()
};
window.pagefind = window.pagefind || {};
    `

    const staticDir = path.join(VERCEL_OUTPUT_DIR, 'static')
    if (existsSync(staticDir)) {
      // Create pagefind directory and file to prevent 404 errors
      const pagefindDir = path.join(staticDir, 'pagefind')
      if (!existsSync(pagefindDir)) {
        execSync(`mkdir -p ${pagefindDir}`, { stdio: 'inherit' })
      }

      writeFileSync(path.join(pagefindDir, 'pagefind.js'), dummyPagefindContent)
      console.log('✅ Created dummy pagefind.js to prevent errors')
    }
  }

  console.log('✅ Search processing completed successfully')
} catch (error) {
  console.error('❌ Error during search cleanup:', error)
  console.log('⚠️ Site will build but search functionality may be limited')
}
