#!/usr/bin/env bash

# Rollback script that handles deployments gracefully

# First create a tag if none exists to prevent rollback error
if [ -z "$(git tag -l 'production-*')" ]; then
  echo "No production tags found. Creating initial tag for current state."
  git tag "production-initial-$(date +%Y%m%d%H%M%S)"
  echo "Created tag. No rollback needed as this is the first deployment."
  exit 0
fi

# Get the second most recent tag if available
TAG=$(git tag -l "production-*" --sort=-committerdate | head -n 2 | tail -n 1)

# If we still don't have a tag, use fallback to main branch
if [ -z "${TAG}" ]; then
  echo "No suitable previous tag found. Falling back to main branch."
  git checkout main
  exit 0
fi

echo "Rolling back to tag: ${TAG}"
git checkout "${TAG}"
