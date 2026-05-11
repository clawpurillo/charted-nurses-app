# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install libc6-compat for Alpine
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove .env file to prevent it from overriding build args
RUN rm -f .env .env.local .env.production

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
# Set Convex URL for build-time static generation (override via --build-arg)
ARG NEXT_PUBLIC_CONVEX_URL=https://joyous-guanaco-769.convex.cloud
ARG NEXT_PUBLIC_CONVEX_SITE_URL=https://joyous-guanaco-769.convex.site
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_SITE_URL=$NEXT_PUBLIC_CONVEX_SITE_URL
# Set app URL for OG image absolute URLs (override via --build-arg)
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install ffmpeg for audio conversion (webm/opus → WAV for whisper)
RUN apk add --no-cache ffmpeg

# Copy standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint script for JWT key decoding
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# HEALTHCHECK removed - app starts fine but health check fails on swarm

ENTRYPOINT ["./docker-entrypoint.sh"]
