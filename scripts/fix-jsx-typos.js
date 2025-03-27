#!/usr/bin/env node

const { promises: fs } = require('fs')
const path = require('path')

const fixes = [
  { from: /<selec(\s|>)/g, to: '<select$1' },
  { from: /<\/selec>/g, to: '</select>' },
  { from: /helperTex/g, to: 'helperText' },
  { from: /export default Selec/g, to: 'export default Select' },
  // Add more fixes as needed
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
        console.log(`Fixed in ${filePath}: ${fix.from} -> ${fix.to}`)
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, newContent, 'utf8')
      console.log(`Updated ${filePath}`)
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error)
  }
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(entry.name)) {
        await processDirectory(fullPath)
      }
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      await fixFile(fullPath)
    }
  }
}

// Start processing from the src directory
processDirectory('src').catch(console.error)
