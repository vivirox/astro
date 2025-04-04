#!/bin/bash

# Deployment script that ensures pnpm is used throughout the process

# Exit on error
set -e

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &>/dev/null; then
  echo -e "${RED}Error: pnpm is not installed.${NC}"
  echo -e "Please install pnpm using: npm install -g pnpm"
  exit 1
fi

# Print info
echo -e "${GREEN}Deploying using pnpm...${NC}"

# Get the environment from args or default to production
ENVIRONMENT=${1:-production}
echo -e "${YELLOW}Deploying to ${ENVIRONMENT} environment${NC}"

# Install dependencies using pnpm
echo -e "${GREEN}Installing dependencies with pnpm...${NC}"
pnpm install

# Validate environment variables
echo -e "${GREEN}Validating environment variables...${NC}"
NODE_ENV=${ENVIRONMENT} VERCEL_ENV=${ENVIRONMENT} node scripts/validate-env.js

# Clean up previous builds
echo -e "${GREEN}Cleaning up previous builds...${NC}"
rm -rf dist

# Build the application
echo -e "${GREEN}Building application with pnpm...${NC}"
NODE_ENV=${ENVIRONMENT} VERCEL_ENV=${ENVIRONMENT} pnpm build

# Run any additional deployment steps based on environment
if [ "${ENVIRONMENT}" = "production" ]; then
  echo -e "${GREEN}Running production-specific deployment steps...${NC}"
  # Add production-specific commands here
elif [ "${ENVIRONMENT}" = "staging" ]; then
  echo -e "${GREEN}Running staging-specific deployment steps...${NC}"
  # Add staging-specific commands here
fi

# Deploy using Vercel CLI if installed
if command -v vercel &>/dev/null; then
  echo -e "${GREEN}Deploying to Vercel using pnpm...${NC}"
  VERCEL_PROJECT_ID=gradiant-astro vercel --prod
else
  echo -e "${YELLOW}Vercel CLI not found. Manual deployment required.${NC}"
  echo -e "To deploy to Vercel, run: vercel --prod"
fi

echo -e "${GREEN}Deployment process completed!${NC}"
