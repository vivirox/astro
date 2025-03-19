#!/bin/bash

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if pnpm is installed
if ! command_exists pnpm; then
  echo "pnpm is not installed. Attempting to install it using npm..."
  
  # Check if npm is installed
  if command_exists npm; then
    npm install -g pnpm
  else
    echo "Error: Neither pnpm nor npm is available. Please install pnpm manually:"
    echo "  npm install -g pnpm"
    echo "  or visit https://pnpm.io/installation for other installation methods"
    exit 1
  fi
fi

# Install dependencies using pnpm
echo "Installing project dependencies..."
pnpm install

# Install Playwright browsers
echo "Installing Playwright browsers for testing..."
npx playwright install --with-deps

# Check for .env file and create from example if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "Creating .env file from .env.example template..."
  cp .env.example .env
  echo "⚠️ Please make sure to update your .env file with the correct values!"
fi

echo "Setup complete! ✨"
echo "You may now run 'pnpm dev' to start the development server."
