#!/bin/bash

# Set error handling
set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../../security-reports"
LOG_FILE="$OUTPUT_DIR/security-test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Log start time
echo "$(date '+%Y-%m-%d %H:%M:%S') Starting security tests..." | tee -a "$LOG_FILE"

# Function to log messages
log() {
  echo -e "${2:-$NC}$1${NC}" | tee -a "$LOG_FILE"
}

# Check dependencies
log "Checking dependencies..." "$YELLOW"

# Check for ts-node
if ! command -v ts-node &> /dev/null; then
  log "ts-node is not installed. Installing..." "$YELLOW"
  pnpm add -g ts-node typescript @types/node
fi

# Check for required node modules
if [ ! -f "package.json" ]; then
  log "package.json not found. Please run this script from the project root." "$RED"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  log "Installing dependencies..." "$YELLOW"
  pnpm install
fi

# Run security tests
log "Running security tests..." "$YELLOW"

cd "$SCRIPT_DIR"

# Set environment variables
export NODE_ENV=test
export BASE_URL=${BASE_URL:-"http://localhost:3000"}
export AUTH_TOKEN=${AUTH_TOKEN:-"user-token"}
export ADMIN_TOKEN=${ADMIN_TOKEN:-"admin-token"}

# Run the test runner
node --loader ts-node/esm run-security-tests.ts 2>&1 | tee -a "$LOG_FILE"

# Check if tests passed
if [ $? -eq 0 ]; then
  log "\nSecurity tests completed successfully! 🎉" "$GREEN"
  log "Check the report at: $OUTPUT_DIR/ai-security-report-$(date '+%Y-%m-%d').html" "$GREEN"
else
  log "\nSecurity tests failed! ❌" "$RED"
  log "Check the log file at: $LOG_FILE" "$RED"
  exit 1
fi

# Log completion time
echo "$(date '+%Y-%m-%d %H:%M:%S') Security tests completed." | tee -a "$LOG_FILE" 