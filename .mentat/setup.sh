#!/bin/bash

# Install dependencies using pnpm
echo "Installing project dependencies..."
pnpm install

# Install Playwright browsers
echo "Installing Playwright browsers for testing..."
pnpm exec playwright install --with-deps

# Check for .env file and create from example if it doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "Creating .env file from .env.example template..."
  cp .env.example .env
  echo "⚠️ Please make sure to update your .env file with the correct values!"
fi

echo "Setup complete! ✨"
echo "You may now run 'pnpm dev' to start the development server."
