#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = resolve(__dirname, '..')

function run(command: string, errorMessage: string = '') {
  try {
    console.log(chalk.blue(`Running: ${command}`))
    execSync(command, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    })
    return true
  } catch (error) {
    console.error(chalk.red(`Error: ${errorMessage || 'Command failed'}`))
    console.error(error)
    return false
  }
}

// Function to check if a program is installed
function checkDependency(dependency: string): boolean {
  try {
    execSync(`which ${dependency} || pnpm list -g ${dependency}`, { stdio: 'ignore' })
    return true
  } catch {
    console.warn(chalk.yellow(`Warning: ${dependency} not found. Skipping related steps.`))
    return false
  }
}

// Main function to run all linting tasks
async function main() {
  let success = true;
  
  // Run Prettier first
  console.log(chalk.blue('\n🔍 Running Prettier...'))
  if (checkDependency('prettier')) {
    success = run('pnpm prettier --write "src/**/*.{ts,tsx,astro,js,jsx,json,css,scss,md}"', 
      'Prettier formatting failed') && success
  }

  // Run ESLint with --fix flag
  console.log(chalk.blue('\n🔍 Running ESLint...'))
  if (checkDependency('eslint')) {
    success = run('pnpm eslint --fix "src/**/*.{ts,tsx,js,jsx}"', 
      'ESLint failed') && success
  }

  // Run oxlint if available
  console.log(chalk.blue('\n🔍 Running Oxlint...'))
  if (checkDependency('oxlint')) {
    run('pnpm dlx oxlint', 'Oxlint check failed (continuing anyway)')
    // Not affecting success status since oxlint is optional
  }

  // Run TypeScript type check
  console.log(chalk.blue('\n🔍 Checking TypeScript types...'))
  if (checkDependency('tsc')) {
    success = run('pnpm tsc --noEmit', 
      'TypeScript type checking failed') && success
  }

  if (success) {
    console.log(chalk.green('\n✅ All done! 🎉'))
    process.exit(0)
  } else {
    console.log(chalk.yellow('\n⚠️ Completed with errors. Please check the output above.'))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error)
  process.exit(1)
})
