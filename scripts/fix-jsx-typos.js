#!/usr/bin/env node

import { promises as fs } from 'fs'
import path from 'path'
import chalk from 'chalk'

const fixes = [
  { from: /<selec(\s|>)/g, to: '<select$1' },
  { from: /<\/selec>/g, to: '</select>' },
  { from: /helperTex([^t]|$)/g, to: 'helperText$1' },
  { from: /export default Selec([^t]|$)/g, to: 'export default Select$1' },
  { from: /<inpu(\s|>)/g, to: '<input$1' },
  { from: /<\/inpu>/g, to: '</input>' },
  { from: /<buton(\s|>)/g, to: '<button$1' },
  { from: /<\/buton>/g, to: '</button>' },
  { from: /formLabe([^l]|$)/g, to: 'formLabel$1' },
  { from: /checkbo([^x]|$)/g, to: 'checkbox$1' },
  { from: /textare([^a]|$)/g, to: 'textarea$1' }
]

async function fixFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    let newContent = content
    let hasChanges = false

    for (const fix of fixes) {
      const fixedContent = newContent.replace(fix.from, fix.to)
      if (fixedContent !== newContent) {
        hasChanges = true
        newContent = fixedContent
        console.log(chalk.green(`Fixed in ${filePath}: ${fix.from} -> ${fix.to}`))
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, newContent, 'utf8')
      console.log(chalk.blue(`Updated ${filePath}`))
      return true
    }
    return false
  } catch (error) {
    console.error(chalk.red(`Error processing ${filePath}:`), error)
    return false
  }
}

async function processDirectory(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    let fixedFiles = 0

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', '.next', 'build'].includes(entry.name)) {
          fixedFiles += await processDirectory(fullPath)
        }
      } else if (
        entry.name.endsWith('.tsx') || 
        entry.name.endsWith('.jsx') || 
        entry.name.endsWith('.astro')
      ) {
        if (await fixFile(fullPath)) {
          fixedFiles++
        }
      }
    }

    return fixedFiles
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dir}:`), error)
    return 0
  }
}

// Start processing from the src directory
async function main() {
  console.log(chalk.blue('Scanning for JSX typos...'))
  try {
    const fixedFiles = await processDirectory('src')
    console.log(chalk.green(`\nFixed ${fixedFiles} files`))
  } catch (error) {
    console.error(chalk.red('Error during execution:'), error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exit(1)
})
