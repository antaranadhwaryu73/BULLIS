# ==============================================================================
# BULLIS Institutional Terminal — Production Container Image
# Multi-stage Alpine container with zero-trust security & unprivileged execution
# ==============================================================================

# --- Stage 1: Build & Bundle ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy full application source
COPY . .

# Build production bundle (SSR & client bundles)
RUN npm run build

# --- Stage 2: Runtime Production Image ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Install runtime utilities & add unprivileged non-root user
RUN apk add --no-cache curl \
    && addgroup -g 1001 -S bullis \
    && adduser -u 1001 -S bullis -G bullis

# Create data directory for JSON ACID persistence with correct permissions
RUN mkdir -p /app/data && chown -R bullis:bullis /app/data

# Copy built assets & node_modules from builder
COPY --from=builder --chown=bullis:bullis /app/package.json ./package.json
COPY --from=builder --chown=bullis:bullis /app/node_modules ./node_modules
COPY --from=builder --chown=bullis:bullis /app/.output ./.output
COPY --from=builder --chown=bullis:bullis /app/src ./src

# Switch to unprivileged user
USER bullis

# Expose institutional port
EXPOSE 8080

# Healthcheck probe hitting institutional endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/v1/health || exit 1

# Start production server
CMD ["node", ".output/server/index.mjs"]
