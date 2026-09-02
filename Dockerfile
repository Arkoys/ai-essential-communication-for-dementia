# syntax=docker/dockerfile:1.7
# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Stage 2: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time args for client-side values. Only NEXT_PUBLIC_* values are
# inlined into the JS bundle; everything else stays server-side and is
# supplied at runtime via the docker-compose environment block.
ARG NEXT_PUBLIC_ADMIN_EMAILS=

# Server-only LLM provider keys + Postgres URL + Better Auth.
# (For local dev, copy these from .env.example; for production, supply them
# via docker-compose env entries — never via NEXT_PUBLIC_* build args.)
ARG DATABASE_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL=http://localhost:3000
ARG ADMIN_EMAILS=
ARG LLM_PROVIDER=harvard
ARG GEMINI_API_KEY
ARG HARVARD_OPENAI_KEY
ARG HARVARD_OPENAI_BASE_URL=https://go.apis.huit.harvard.edu/ais-openai-direct/v2/
ARG HARVARD_MODEL=gpt-5.5

ENV NEXT_PUBLIC_ADMIN_EMAILS=$NEXT_PUBLIC_ADMIN_EMAILS \
    DATABASE_URL=$DATABASE_URL \
    BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    BETTER_AUTH_URL=$BETTER_AUTH_URL \
    ADMIN_EMAILS=$ADMIN_EMAILS \
    LLM_PROVIDER=$LLM_PROVIDER \
    GEMINI_API_KEY=$GEMINI_API_KEY \
    HARVARD_OPENAI_KEY=$HARVARD_OPENAI_KEY \
    HARVARD_OPENAI_BASE_URL=$HARVARD_OPENAI_BASE_URL \
    HARVARD_MODEL=$HARVARD_MODEL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- Stage 3: runner ----------
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
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
