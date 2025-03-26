#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = resolve(__dirname, '..')

function run(command: string) {
  execSync(command, {
    stdio: 'inherit',
    cwd: ROOT_DIR,
  })
}
// Run Prettier first
console.log('Running Prettier...')
run('pnpm prettier --write "src/**/*.{ts,tsx,astro}"')

// Run ESLint with --fix flag
console.log('\nRunning ESLint...')
run('pnpm eslint --fix "src/**/*.{ts,tsx}"')

// Run TypeScript type check
console.log('\nChecking TypeScript types...')
run('pnpm tsc --noEmit')

console.log('\nAll done! 🎉')
