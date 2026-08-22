# syntax=docker/dockerfile:1.6

# ---------- Base image ----------
FROM node:20-alpine AS base

# ---------- deps: install ALL deps for building ----------
FROM base AS deps
WORKDIR /app

# Prefer IPv4 for Node DNS resolution
ENV NODE_OPTIONS=--dns-result-order=ipv4first

# Native build tooling
RUN apk add --no-cache libc6-compat openssl python3 make g++

# Install from lockfile
COPY package*.json ./
RUN npm ci --no-audit --no-fund --include=dev --silent \
  && npm cache clean --force

# ---------- builder: compile Next app ----------
FROM base AS builder
WORKDIR /app

ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV NEXT_TELEMETRY_DISABLED=1

# Rehydrate node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy entire repo
COPY . .

# Remove marketing folder so it does not affect build
RUN rm -rf marketing

# Public build args (NO secrets)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

# Build Next.js
ENV NODE_ENV=production
RUN NODE_OPTIONS="--dns-result-order=ipv4first --no-warnings" npm run build

# ---------- runner: minimal production image ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache curl wget openssl libc6-compat supervisor

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/supervisord.conf ./supervisord.conf

EXPOSE 3000

# Use the lightweight app health endpoint. Database readiness is enforced
# by supervisord because Next.js and the gmail worker wait for
# `database-setup` to finish and create /tmp/db-ready before they start.
HEALTHCHECK --interval=15s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

USER nextjs

CMD ["supervisord", "-c", "/app/supervisord.conf"]
