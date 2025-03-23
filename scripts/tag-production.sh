#!/usr/bin/env bash

# Tag current state as a production deployment
TAG_NAME="production-$(date +%Y%m%d%H%M%S)"

echo "Creating production tag: ${TAG_NAME}"
git tag "${TAG_NAME}"
echo "Tag created. You can push it with: git push origin ${TAG_NAME}"
