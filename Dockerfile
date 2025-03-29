# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=23.10.0
FROM node:${NODE_VERSION}-slim AS base

LABEL org.opencontainers.image.description="Astro"

# Install pnpm first (as root)
ARG PNPM_VERSION=10.6.5
RUN npm install -g pnpm@$PNPM_VERSION

# Install packages needed to build node modules (while still root)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential=12.9 \
    node-gyp=9.4.0 \
    pkg-config=1.8.1 \
    python-is-python3=3.10.0-2 \
    curl=7.88.1-10 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Astro app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install node modules
COPY --chown=node:node package.json pnpm-lock.yaml .npmrc ./

# Switch to non-root user for the build process
USER node

RUN pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY --chown=node:node . .

# Build application
RUN pnpm build && \
    pnpm prune --prod

# Final stage for app image
FROM base

# Add healthcheck (in the final stage)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4321/api/health || exit 1

# Switch to non-root user for the final image
USER node

# Copy built application
COPY --from=build --chown=node:node /app /app

# Entrypoint sets up the container
ENTRYPOINT ["/app/docker-entrypoint.js"]

# Start the server by default
EXPOSE 4321
CMD ["node", "dist/server/entry.mjs"]
