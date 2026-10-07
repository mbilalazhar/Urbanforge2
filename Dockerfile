
FROM node:24-alpine AS base

WORKDIR /app

# Helps compatibility with some Node/native packages on Alpine
RUN apk add --no-cache libc6-compat

FROM base AS deps

COPY package.json package-lock.json ./

RUN npm ci


FROM base AS builder

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy project files
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=$SITE_URL

# Build production version
RUN npm run build


FROM node:24-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js server configuration
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs

RUN adduser \
    --system \
    --uid 1001 \
    --ingroup nodejs \
    nextjs

# Public assets
COPY --from=builder /app/public ./public

# Standalone Next.js production server
COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/standalone ./

# Next.js static assets
COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
