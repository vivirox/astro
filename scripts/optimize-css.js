/**
 * CSS Optimization Script for Production
 *
 * This script optimizes all CSS files in the dist directory after the build process.
 * It uses PostCSS and cssnano to:
 * - Remove whitespace and comments
 * - Remove unused CSS
 * - Optimize and minify CSS
 * - Create .css.map files for debugging
 */

import fs from 'fs'
import path from 'path'
import postcss from 'postcss'
import cssnano from 'cssnano'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

// Get the directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Set up PostCSS with cssnano
const processor = postcss([
  cssnano({
    preset: [
      'advanced',
      {
        discardComments: { removeAll: true },
        reduceIdents: false, // Preserve animation names
        zindex: false, // Don't rebase z-index
        colormin: true, // Minify colors
        autoprefixer: { add: true }, // Add vendor prefixes
      },
    ],
  }),
])

// Stats tracking
let totalFiles = 0
let totalSizeBefore = 0
let totalSizeAfter = 0
let skippedFiles = 0
let errorFiles = 0

/**
 * Process a CSS file using PostCSS and cssnano
 */
async function processFile(filePath) {
  const startTime = Date.now()
  
  try {
    // Check if file exists and is writable
    await fs.promises.access(filePath, fs.constants.R_OK | fs.constants.W_OK)
    
    // Read the file
    const css = await fs.promises.readFile(filePath, 'utf8')
    const originalSize = Buffer.byteLength(css, 'utf8')
    
    // Skip empty files
    if (originalSize === 0) {
      console.log(chalk.yellow(`⚠️ Skipping empty file: ${filePath}`))
      skippedFiles++
      return
    }
    
    totalSizeBefore += originalSize

    // Process the CSS
    const result = await processor.process(css, {
      from: filePath,
      to: filePath,
      map: { inline: false },
    })

    // Write the processed CSS back to the file
    await fs.promises.writeFile(filePath, result.css)

    // Write the source map if it exists
    if (result.map) {
      await fs.promises.writeFile(`${filePath}.map`, result.map.toString())
    }

    const optimizedSize = Buffer.byteLength(result.css, 'utf8')
    totalSizeAfter += optimizedSize

    const savings = ((originalSize - optimizedSize) / originalSize) * 100
    const processingTime = Date.now() - startTime
    
    if (savings > 0) {
      console.log(
        chalk.green(`✓ Optimized: ${filePath} (${savings.toFixed(2)}% reduction, ${processingTime}ms)`)
      )
    } else {
      console.log(
        chalk.blue(`- Already optimized: ${filePath} (${processingTime}ms)`)
      )
    }

    totalFiles++
  } catch (error) {
    console.error(chalk.red(`❌ Error processing file ${filePath}:`), error.message)
    errorFiles++
  }
}

/**
 * Recursively walk through directories to find CSS files
 */
async function walkDir(dir) {
  try {
    const files = await fs.promises.readdir(dir)
    const fileProcessingPromises = []

    for (const file of files) {
      const filePath = path.join(dir, file)
      
      try {
        const stat = await fs.promises.stat(filePath)

        if (stat.isDirectory()) {
          // Recursively process subdirectories
          await walkDir(filePath)
        } else if (path.extname(file) === '.css') {
          // Process CSS files (limit concurrent processing)
          fileProcessingPromises.push(processFile(filePath))
          
          // Process in batches of 5 to avoid memory issues
          if (fileProcessingPromises.length >= 5) {
            await Promise.all(fileProcessingPromises)
            fileProcessingPromises.length = 0
          }
        }
      } catch (error) {
        console.error(chalk.red(`Error accessing ${filePath}:`), error.message)
      }
    }

    // Process any remaining files
    if (fileProcessingPromises.length > 0) {
      await Promise.all(fileProcessingPromises)
    }
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dir}:`), error.message)
  }
}

async function main() {
  console.log(chalk.blue('Starting CSS optimization...'))
  const startTime = Date.now()

  const distDir = path.resolve(__dirname, '../dist')

  if (!fs.existsSync(distDir)) {
    console.error(
      chalk.red(`Error: ${distDir} does not exist. Make sure to run the build first.`)
    )
    process.exit(1)
  }

  // Process all CSS files in the dist directory
  await walkDir(distDir)

  // Display summary
  const endTime = Date.now()
  const processingTime = ((endTime - startTime) / 1000).toFixed(2)
  
  if (totalFiles === 0) {
    console.log(chalk.yellow('\nNo CSS files found to optimize!'))
    return
  }

  const totalSavings = ((totalSizeBefore - totalSizeAfter) / totalSizeBefore) * 100

  console.log('\n' + chalk.blue('Optimization summary:'))
  console.log(chalk.blue('-------------------'))
  console.log(`Processed: ${chalk.green(totalFiles)} CSS files`)
  console.log(`Skipped: ${chalk.yellow(skippedFiles)} files`)
  console.log(`Errors: ${errorFiles > 0 ? chalk.red(errorFiles) : chalk.green(errorFiles)} files`)
  console.log(`Original size: ${chalk.yellow((totalSizeBefore / 1024).toFixed(2))} KB`)
  console.log(`Optimized size: ${chalk.green((totalSizeAfter / 1024).toFixed(2))} KB`)
  console.log(
    `Total savings: ${chalk.green(totalSavings.toFixed(2))}% (${chalk.green(
      ((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)
    )} KB)`
  )
  console.log(`Completed in: ${chalk.blue(processingTime)} seconds`)
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exit(1)
})
