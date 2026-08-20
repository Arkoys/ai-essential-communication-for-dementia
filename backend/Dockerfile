# Backend Dockerfile - Express proxy server for Harvard API
# Production-ready with proper logging and security

FROM node:20-alpine

LABEL maintainer="your-email@example.com"
LABEL description="Harvard API Proxy Server"

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies (use --omit=dev for production-only deps)
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY backend/server.js ./

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "server.js"]
