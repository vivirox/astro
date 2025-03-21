#!/usr/bin/env node

/**
 * Script to remove underscore prefixes from filenames and identifiers within files
 *
 * Handles:
 * - Variables (const/let/var name)
 * - Functions (function name)
 * - Classes (class Name)
 * - Interfaces (interface Name)
 * - Types (type Name)
 * - File names with underscores
 */

import { promises as fs, statSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the current directory
const _filename = fileURLToPath(import.meta.url)
const _dirname = path.dirname(_filename)

// Configuration
const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')
const ROOT_DIR = process.argv.includes('--dir')
  ? process.argv[process.argv.indexOf('--dir') + 1]
  : '.'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB file size limit

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  '.astro',
  '.cursor',
  '.next',
]

const IGNORED_FILES = [
  '.DS_Store',
  'pnpm-lock.yaml',
  'package-lock.json',
  'grad-output.txt',
  'repomix-output.xml',
]

// Track changes for reporting
const changes = {
  filesRenamed: [],
  identifiersReplaced: {},
  errors: [],
  skipped: [],
}

// Regex patterns for finding underscore prefixes
const patterns = [
  // Variables with underscore prefix
  {
    pattern: /(const|let|var)\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, prefix, name) => `${prefix} ${name.substring(1)}`,
  },
  // Function declarations with underscore prefix
  {
    pattern: /function\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, name) => `function ${name.substring(1)}`,
  },
  // Classes with underscore prefix
  {
    pattern: /class\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, name) => `class ${name.substring(1)}`,
  },
  // Interfaces with underscore prefix
  {
    pattern: /interface\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, name) => `interface ${name.substring(1)}`,
  },
  // Types with underscore prefix
  {
    pattern: /type\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, name) => `type ${name.substring(1)}`,
  },
  // Exported variables with underscore prefix
  {
    pattern: /export\s+(const|let|var)\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, exportType, name) =>
      `export ${exportType} ${name.substring(1)}`,
  },
  // Exported classes with underscore prefix
  {
    pattern: /export\s+class\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, name) => `export class ${name.substring(1)}`,
  },
  // Exported interfaces with underscore prefix
  {
    pattern: /export\s+interface\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, name) => `export interface ${name.substring(1)}`,
  },
  // Exported types with underscore prefix
  {
    pattern: /export\s+type\s+(_[a-zA-Z][a-zA-Z0-9]*)\b/g,
    getNewName: (match, name) => `export type ${name.substring(1)}`,
  },
  // Object property with underscore prefix
  {
    pattern: /\b(_[a-zA-Z][a-zA-Z0-9]*)\s*:/g,
    getNewName: (match, name) => `${name.substring(1)}:`,
  },
  // Anonymous function parameter with underscore prefix
  {
    pattern: /\(\s*(_[a-zA-Z][a-zA-Z0-9]*)\s*\)/g,
    getNewName: (match, name) => `(${name.substring(1)})`,
  },
  // Multiple parameters with underscore prefix
  {
    pattern: /\(\s*(_[a-zA-Z][a-zA-Z0-9]*)\s*,/g,
    getNewName: (match, name) => `(${name.substring(1)},`,
  },
  {
    pattern: /,\s*(_[a-zA-Z][a-zA-Z0-9]*)\s*\)/g,
    getNewName: (match, name) => `, ${name.substring(1)})`,
  },
  {
    pattern: /,\s*(_[a-zA-Z][a-zA-Z0-9]*)\s*,/g,
    getNewName: (match, name) => `, ${name.substring(1)},`,
  },
]

// Mapping to track renamed identifiers for consistent replacements
const identifierMap = new Map()

/**
 * Check if a file should be ignored
 */
function shouldIgnoreFile(filePath) {
  const fileName = path.basename(filePath)

  // Check if file is in ignored list
  if (IGNORED_FILES.includes(fileName)) {
    return true
  }

  // Skip binary files or non-text files
  if (
    filePath.endsWith('.png') ||
    filePath.endsWith('.jpg') ||
    filePath.endsWith('.jpeg') ||
    filePath.endsWith('.gif') ||
    filePath.endsWith('.pdf') ||
    filePath.endsWith('.woff') ||
    filePath.endsWith('.woff2') ||
    filePath.endsWith('.ttf') ||
    filePath.endsWith('.otf') ||
    filePath.endsWith('.ico') ||
    filePath.endsWith('.svg') ||
    filePath.endsWith('.pack.gz') ||
    filePath.endsWith('.pack') ||
    fileName.endsWith('.pack')
  ) {
    return true
  }

  try {
    // Check file size and skip if too large
    const stats = statSync(filePath)

    if (stats.isDirectory()) {
      return true
    }

    if (stats.size > MAX_FILE_SIZE) {
      console.log(
        `Skipping large file: ${filePath} (${Math.round(stats.size / 1024 / 1024)}MB)`
      )
      changes.skipped.push({
        path: filePath,
        reason: `File too large: ${Math.round(stats.size / 1024 / 1024)}MB`,
      })
      return true
    }

    return false
  } catch (error) {
    console.error(`Error checking file ${filePath}: ${error.message}`)
    changes.errors.push(`Error checking file ${filePath}: ${error.message}`)
    return true
  }
}

/**
 * Process a file to remove underscore prefixes from identifiers
 */
async function processFile(filePath) {
  try {
    // Skip ignored files
    if (shouldIgnoreFile(filePath)) {
      return
    }

    let content
    try {
      content = await fs.readFile(filePath, 'utf-8')
    } catch (error) {
      console.error(`Error reading file ${filePath}: ${error.message}`)
      changes.errors.push(`Error reading file ${filePath}: ${error.message}`)
      return
    }

    // Process each pattern
    let newContent = content
    let fileChanged = false

    for (const { pattern, getNewName } of patterns) {
      let lastMatches = []

      // Use a replacer function to remember found identifiers
      newContent = newContent.replace(pattern, (...args) => {
        const match = args[0]
        // Get original underscored name
        const underscoredName = args[1]?.startsWith?.('_') ? args[1] : args[2]

        if (!underscoredName) {
          return match // Skip if we can't determine the underscored name
        }

        // Check if we've seen this identifier before
        if (!identifierMap.has(underscoredName)) {
          // Remove the underscore
          const newName = underscoredName.substring(1)
          identifierMap.set(underscoredName, newName)
        }

        const replacement = getNewName(...args)

        // Track changes
        if (match !== replacement) {
          fileChanged = true
          lastMatches.push({ from: match, to: replacement })

          if (!changes.identifiersReplaced[filePath]) {
            changes.identifiersReplaced[filePath] = []
          }
          changes.identifiersReplaced[filePath].push({
            from: match,
            to: replacement,
          })
        }

        return replacement
      })

      // Now replace references to the renamed identifiers
      for (const [oldName, newName] of identifierMap.entries()) {
        // Don't replace declarations again, just references
        // Use word boundaries to avoid partial matches
        const refPattern = new RegExp(`\\b${oldName}\\b`, 'g')

        // Skip first occurrence which is the declaration we already replaced
        let count = 0
        newContent = newContent.replace(refPattern, (match) => {
          // Skip the already processed matches to avoid double replacement
          for (const processedMatch of lastMatches) {
            if (processedMatch.from.includes(match)) {
              return match
            }
          }

          count++
          if (VERBOSE) {
            console.log(`  Replacing reference: ${match} -> ${newName}`)
          }

          fileChanged = true

          if (!changes.identifiersReplaced[filePath]) {
            changes.identifiersReplaced[filePath] = []
          }
          changes.identifiersReplaced[filePath].push({
            from: match,
            to: newName,
          })

          return newName
        })
      }
    }

    if (fileChanged && !DRY_RUN) {
      await fs.writeFile(filePath, newContent, 'utf-8')
      console.log(`Updated file: ${filePath}`)
    } else if (fileChanged) {
      console.log(`Would update file: ${filePath} (dry run)`)
    }

    return fileChanged
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`)
    changes.errors.push(`Error processing file ${filePath}: ${error.message}`)
  }
}

/**
 * Recursively process a directory to find all files
 */
async function processDirectory(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)

      // Skip ignored directories
      if (entry.isDirectory() && IGNORED_DIRS.includes(entry.name)) {
        console.log(`Skipping directory: ${fullPath}`)
        continue
      }

      if (entry.isDirectory()) {
        // Process the subdirectory
        await processDirectory(fullPath)
      } else {
        // Process the file
        await processFile(fullPath)

        // Check if the filename has an underscore prefix
        if (entry.name.startsWith('_')) {
          const newFileName = entry.name.substring(1)
          const newFullPath = path.join(directory, newFileName)

          changes.filesRenamed.push({ from: fullPath, to: newFullPath })

          if (!DRY_RUN) {
            await fs.rename(fullPath, newFullPath)
            console.log(`Renamed file: ${fullPath} -> ${newFullPath}`)
          } else {
            console.log(
              `Would rename file: ${fullPath} -> ${newFullPath} (dry run)`
            )
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${directory}: ${error.message}`)
    changes.errors.push(
      `Error processing directory ${directory}: ${error.message}`
    )
  }
}

/**
 * Generate a report of all changes made
 */
function generateReport() {
  let report = '# Underscore Removal Report\n\n'

  // Files renamed
  report += '## Files Renamed\n\n'
  if (changes.filesRenamed.length === 0) {
    report += 'No files renamed.\n\n'
  } else {
    report += '| From | To |\n|------|----|\n'
    for (const { from, to } of changes.filesRenamed) {
      report += `| \`${from}\` | \`${to}\` |\n`
    }
    report += '\n'
  }

  // Identifiers replaced
  report += '## Identifiers Replaced\n\n'
  const files = Object.keys(changes.identifiersReplaced)
  if (files.length === 0) {
    report += 'No identifiers replaced.\n\n'
  } else {
    for (const file of files) {
      report += `### ${file}\n\n`
      report += '| From | To |\n|------|----|\n'

      // Group by from -> to to avoid duplicates
      const replacements = new Map()
      for (const { from, to } of changes.identifiersReplaced[file]) {
        replacements.set(from, to)
      }

      for (const [from, to] of replacements.entries()) {
        report += `| \`${from}\` | \`${to}\` |\n`
      }
      report += '\n'
    }
  }

  // Skipped files
  report += '## Skipped Files\n\n'
  if (changes.skipped.length === 0) {
    report += 'No files skipped.\n\n'
  } else {
    report += '| File | Reason |\n|------|-------|\n'
    for (const { path, reason } of changes.skipped) {
      report += `| \`${path}\` | ${reason} |\n`
    }
    report += '\n'
  }

  // Errors
  report += '## Errors\n\n'
  if (changes.errors.length === 0) {
    report += 'No errors encountered.\n'
  } else {
    for (const error of changes.errors) {
      report += `- ${error}\n`
    }
  }

  return report
}

/**
 * Main function
 */
async function main() {
  console.log(`Starting underscore removal${DRY_RUN ? ' (dry run)' : ''}...`)

  // Process the directory
  await processDirectory(ROOT_DIR)

  // Generate report
  const report = generateReport()

  // Save the report
  const reportPath = 'underscore-removal-report.md'
  if (!DRY_RUN) {
    await fs.writeFile(reportPath, report, 'utf-8')
    console.log(`Report saved to ${reportPath}`)
  } else {
    console.log(`Would save report to ${reportPath} (dry run)`)
    console.log('\nReport preview:')
    console.log('-------------------')
    console.log(report)
    console.log('-------------------')
  }

  console.log('Done!')
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error)
  process.exit(1)
})
