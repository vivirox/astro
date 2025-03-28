#!/bin/bash

# Define colors
# shellcheck disable=SC2034
# shellcheck disable=SC2034
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define log function
log() {
  local message="$1"
  local color="${2:-${NC}}"
  echo -e "${color}${message}${NC}"
}

log "\nSecurity tests failed! ❌" "${RED}"
