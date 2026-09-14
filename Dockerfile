# syntax=docker/dockerfile:1.7
# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: database migrations ----------
FROM deps AS migration
WORKDIR /app
COPY . .
CMD ["node", "--import", "tsx", "scripts/migrate.ts"]

# ---------- Stage 3: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Only public values belong in build arguments. Server credentials are
# supplied to the runtime container and are never stored in image layers.
ARG NEXT_PUBLIC_ADMIN_EMAILS=

ENV NEXT_PUBLIC_ADMIN_EMAILS=$NEXT_PUBLIC_ADMIN_EMAILS \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- Stage 4: runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone server, the static assets, and the public/ folder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public

USER nextjs
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/healthz || exit 1

CMD ["node", "server.js"]
