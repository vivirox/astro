#!/bin/bash

# Script to set up Vercel secrets for your project
# This allows you to securely store sensitive tokens without including them in your repository

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &>/dev/null; then
  echo -e "${RED}Error: Vercel CLI is not installed.${NC}"
  echo -e "Please install it using: npm install -g vercel"
  exit 1
fi

# Check if logged in to Vercel
echo -e "${YELLOW}Checking Vercel login status...${NC}"
VERCEL_LOGIN_STATUS=$(vercel whoami 2>&1)
if [[ ${VERCEL_LOGIN_STATUS} == *"Error"* ]]; then
  echo -e "${YELLOW}You need to log in to Vercel first.${NC}"
  vercel login
fi

# Get project details
echo -e "${YELLOW}Linking to Vercel project...${NC}"
vercel link

# Function to securely set a secret
set_secret() {
  local name="${1}"
  local prompt="${2}"

  echo -e "${YELLOW}${prompt}${NC}"
  read -rs secret
  echo

  if [ -z "${secret}" ]; then
    echo -e "${RED}Error: Secret cannot be empty.${NC}"
    return 1
  fi

  echo -e "${GREEN}Setting ${name} secret...${NC}"
  vercel env add "${name}" production <<<"${secret}"
  vercel env add "${name}" preview <<<"${secret}"
  vercel env add "${name}" development <<<"${secret}"
  echo -e "${GREEN}Secret ${name} has been set for all environments.${NC}"
}

# Set up Supabase secrets
set_secret "PUBLIC_SUPABASE_URL" "Enter your Supabase URL:"
set_secret "PUBLIC_SUPABASE_ANON_KEY" "Enter your Supabase Anon Key:"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "Enter your Supabase Service Role Key:"

# Set up Redis secrets
set_secret "UPSTASH_REDIS_REST_URL" "Enter your Upstash Redis REST URL:"
set_secret "UPSTASH_REDIS_REST_TOKEN" "Enter your Upstash Redis REST Token:"

# Set up OpenAI API Key if needed
read -rp "Do you want to set up an OpenAI API Key? (y/n): " set_openai
if [[ ${set_openai} == "y" || ${set_openai} == "Y" ]]; then
  set_secret "OPENAI_API_KEY" "Enter your OpenAI API Key:"
fi

# Set up additional secrets
read -rp "Do you want to set up additional secrets? (y/n): " more_secrets
if [[ ${more_secrets} == "y" || ${more_secrets} == "Y" ]]; then
  while true; do
    read -rp "Enter secret name (or 'done' to finish): " secret_name
    if [[ ${secret_name} == "done" ]]; then
      break
    fi
    set_secret "${secret_name}" "Enter value for ${secret_name}:"
  done
fi

echo -e "${GREEN}All secrets have been set up successfully!${NC}"
echo -e "${YELLOW}IMPORTANT: Make sure to deploy your application to apply these changes.${NC}"
echo -e "Run: ${GREEN}npm run deploy:production${NC}"
