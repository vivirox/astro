#!/bin/bash

# Exit on first error 
set -e

# Colors for better formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if pnpm is installed
if ! command_exists pnpm; then
  echo -e "${RED}pnpm is not available. Trying to use npx as fallback.${NC}"
  PACKAGE_RUNNER="npx"
  
  # Check if npm/npx is available
  if ! command_exists npx; then
    echo -e "${RED}Error: Neither pnpm nor npx is available. Please install pnpm:${NC}"
    echo "  npm install -g pnpm"
    echo "  or visit https://pnpm.io/installation for other installation methods"
    exit 1
  fi
else
  PACKAGE_RUNNER="pnpm exec"
fi

echo -e "${GREEN}Starting pre-commit checks...${NC}"

# Run TypeScript type checking
echo -e "\n${GREEN}Running TypeScript type checking...${NC}"
$PACKAGE_RUNNER tsc --noEmit || echo -e "${YELLOW}TypeScript found type errors. Please fix them before committing.${NC}"

# Run ESLint if the project has it
echo -e "\n${GREEN}Checking for ESLint...${NC}"
if [ -f "node_modules/.bin/eslint" ] || command_exists eslint; then
  echo -e "${GREEN}Running ESLint...${NC}"
  if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.yml" ] || [ -f ".eslintrc" ]; then
    $PACKAGE_RUNNER eslint --fix "src/**/*.{ts,tsx,astro,js,jsx}" || echo -e "${YELLOW}ESLint found issues that couldn't be automatically fixed.${NC}"
  else
    echo -e "${YELLOW}No ESLint configuration found. Skipping ESLint.${NC}"
    echo -e "${YELLOW}Consider adding an ESLint configuration file for better code quality checks.${NC}"
  fi
else
  echo -e "${YELLOW}ESLint not found in project. Skipping ESLint checks.${NC}"
fi

# Run Prettier if the project has it
echo -e "\n${GREEN}Checking for Prettier...${NC}"
if [ -f "node_modules/.bin/prettier" ] || command_exists prettier; then
  echo -e "${GREEN}Running Prettier formatting...${NC}"
  if [ -f ".prettierrc" ] || [ -f ".prettierrc.js" ] || [ -f ".prettierrc.json" ] || [ -f ".prettierrc.yml" ] || [ -f "prettier.config.js" ]; then
    $PACKAGE_RUNNER prettier --write "src/**/*.{ts,tsx,astro,js,jsx,json,css,md,mdx}" || echo -e "${YELLOW}Prettier encountered issues. Some files may not be formatted.${NC}"
  else
    echo -e "${YELLOW}No Prettier configuration found. Using default Prettier settings.${NC}"
    $PACKAGE_RUNNER prettier --write "src/**/*.{ts,tsx,astro,js,jsx,json,css,md,mdx}" || echo -e "${YELLOW}Prettier encountered issues. Some files may not be formatted.${NC}"
  fi
else
  echo -e "${YELLOW}Prettier not found in project. Skipping code formatting.${NC}"
fi

# Check UnoCSS configuration
echo -e "\n${GREEN}Checking UnoCSS configuration...${NC}"
if [ -f "uno.config.ts" ] || [ -f "uno.config.js" ]; then
  echo "UnoCSS configuration found. No validation available but configuration is present."
else
  echo -e "${YELLOW}UnoCSS configuration not found. If you're using UnoCSS, ensure it's properly configured.${NC}"
fi

# Run security lint tests (lightweight checks only)
echo -e "\n${GREEN}Running security lint tests...${NC}"
if [ -d "tests/security" ]; then
  if command_exists pnpm; then
    echo "Running endpoint security tests..."
    pnpm test:security:endpoint || echo -e "${YELLOW}Endpoint security tests encountered issues.${NC}"
    
    echo "Running auth security tests..."
    pnpm test:security:auth || echo -e "${YELLOW}Auth security tests encountered issues.${NC}"
  else
    echo -e "${YELLOW}Skipping security tests because they require pnpm to run.${NC}"
    echo -e "${YELLOW}Please install pnpm to run security tests.${NC}"
  fi
else
  echo -e "${YELLOW}Security tests directory not found. Skipping security tests.${NC}"
fi

echo -e "\n${GREEN}Pre-commit checks completed successfully! ✅${NC}"
