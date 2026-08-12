# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (using npm as fallback if pnpm not available)
RUN npm install || npm install pnpm && pnpm install

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install serve to serve static files
RUN npm install -g serve

# Copy built assets from development stage
COPY --from=development /app/dist ./dist

# Expose production port
EXPOSE 3000

# Start production server
CMD ["serve", "-s", "dist", "-l", "3000"]
