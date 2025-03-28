# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=23.10.0
FROM node:${NODE_VERSION}-slim AS base

LABEL org.opencontainers.image.description="Astro"

# Install pnpm first (as root)
ARG PNPM_VERSION=10.6.5
RUN npm install -g pnpm@$PNPM_VERSION

# Create non-root user and switch to it
USER node

# Add healthcheck
HEALTHCHECK \
    --interval=30s \
    --timeout=3s \
    --start-period=5s \
    --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Astro app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential=12.9 \
    node-gyp=9.4.0 \
    pkg-config=1.8.1 \
    python-is-python3=3.10.0-2

# Install node modules
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY . .

# Build application
RUN pnpm build && \
    pnpm prune --prod

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Entrypoint sets up the container
ENTRYPOINT ["/app/docker-entrypoint.js"]

# Start the server by default
EXPOSE 3000
CMD ["node", "dist/server/entry.mjs"]
