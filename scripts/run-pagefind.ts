#!/usr/bin/env tsx

import { execSync } from 'child_process'
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  readFileSync,
} from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'

/**
 * Script to handle running pagefind across different architectures
 * Specifically addresses the darwin-arm64 (Apple Silicon) compatibility issue
 */

const DIST_DIR = path.join(process.cwd(), 'dist')
const PAGEFIND_DIR = path.join(DIST_DIR, 'pagefind')

console.log('🔍 Running pagefind...')

// Make sure the dist directory exists
if (!existsSync(DIST_DIR)) {
  console.error('❌ Error: dist directory not found. Run build first.')
  process.exit(1)
}

// Create the pagefind directory if it doesn't exist
if (!existsSync(PAGEFIND_DIR)) {
  mkdirSync(PAGEFIND_DIR, { recursive: true })
}

// Get system architecture
const platform = os.platform()
const arch = os.arch()

console.log(`📊 Detected platform: ${platform}-${arch}`)

/**
 * Creates a basic search index for pages in the dist directory
 * This is a fallback when pagefind can't run on the current architecture
 */
function createBasicSearchIndex() {
  console.log('🔧 Creating basic search index as fallback...')

  // Create directories
  mkdirSync(path.join(PAGEFIND_DIR, 'indexes'), { recursive: true })
  mkdirSync(path.join(PAGEFIND_DIR, 'fragments'), { recursive: true })

  // Find HTML files in dist
  const htmlFiles = findHtmlFiles(DIST_DIR)
  console.log(`📄 Found ${htmlFiles.length} HTML files for indexing`)

  // Create a simple index
  const index = {
    version: '0.6.24',
    files: htmlFiles.length,
    options: {
      minWordLength: 3,
      maxWordLength: 20,
      language: 'en',
    },
  }

  // Write index file
  writeFileSync(path.join(PAGEFIND_DIR, 'pagefind.json'), JSON.stringify(index))

  // Create a basic index for each HTML file
  htmlFiles.forEach((htmlFile, idx) => {
    const hash = crypto
      .createHash('md5')
      .update(htmlFile)
      .digest('hex')
      .substring(0, 8)
    const pageId = `p${idx}_${hash}`
    const filePath = path.join(DIST_DIR, htmlFile)

    try {
      const content = readFileSync(filePath, 'utf-8')
      const title = extractTitle(content) || path.basename(htmlFile, '.html')

      // Extract text content (simplified)
      let text = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      // Create basic page data
      const pageData = {
        id: pageId,
        title: title,
        content: text.substring(0, 500), // Limited content
        url: '/' + htmlFile.replace(/index\.html$/, ''),
        filters: {},
      }

      // Write to fragments directory
      writeFileSync(
        path.join(PAGEFIND_DIR, 'fragments', `${pageId}.json`),
        JSON.stringify(pageData),
      )

      // Create a simple word index (just pointing to the page)
      const words = extractWords(text)
      const wordIndex = {}

      words.forEach((word) => {
        if (word.length >= 3 && word.length <= 20) {
          wordIndex[word] = { [pageId]: [0] }
        }
      })

      // Write word index
      writeFileSync(
        path.join(PAGEFIND_DIR, 'indexes', `${idx}.json`),
        JSON.stringify(wordIndex),
      )
    } catch (error) {
      console.log(`⚠️ Error processing ${htmlFile}: ${error.message}`)
    }
  })

  console.log('✅ Basic search index created successfully')
}

/**
 * Extract a page title from HTML content
 */
function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleMatch ? titleMatch[1].trim() : null
}

/**
 * Extract words from text for indexing
 */
function extractWords(text) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3),
    ),
  ]
}

/**
 * Find all HTML files in a directory recursively
 */
function findHtmlFiles(dir, baseDir = '') {
  baseDir = baseDir || dir
  let results = []

  const items = readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    const relativePath = path.relative(baseDir, fullPath)

    if (item.isDirectory()) {
      results = results.concat(findHtmlFiles(fullPath, baseDir))
    } else if (item.name.endsWith('.html')) {
      results.push(relativePath)
    }
  }

  return results
}

try {
  if (platform === 'darwin' && arch === 'arm64') {
    console.log('⚠️ Detected Apple Silicon (M1/M2/M3) Mac')
    console.log('ℹ️ Using custom pagefind approach for Apple Silicon')

    // On Apple Silicon, we need a different approach
    // Option 1: Use Rosetta to run the x64 version
    try {
      console.log('🔄 Attempting to run pagefind using Rosetta 2...')
      execSync('arch -x86_64 npx pagefind --site dist', { stdio: 'inherit' })
    } catch (error) {
      console.log('⚠️ Rosetta attempt failed, generating basic search index...')
      createBasicSearchIndex()
    }
  } else {
    // For other architectures, use standard pagefind
    console.log('🔄 Running standard pagefind...')
    execSync('npx pagefind --site dist', { stdio: 'inherit' })
  }

  // Clean up UI files that aren't needed
  console.log('🧹 Cleaning up UI files...')
  execSync('npx del-cli "dist/pagefind/*ui*"', { stdio: 'inherit' })

  console.log('✅ Pagefind processing completed successfully')
} catch (error) {
  console.error('❌ Error during pagefind processing:', error)
  console.log('⚠️ Site will build but search functionality may be limited')
  // Create a fallback search index if we haven't already
  createBasicSearchIndex()
}
