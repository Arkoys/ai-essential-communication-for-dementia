# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy npm package files (package-lock.json is used when present)
COPY package*.json ./

# Install dependencies with the package manager used by this repository
RUN npm install

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
