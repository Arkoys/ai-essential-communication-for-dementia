# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install || npm install pnpm && pnpm install

# Stage 2: Build
FROM deps AS build

WORKDIR /app

COPY . .
RUN npm run build

# Stage 3: Production - serve static files
FROM node:20-alpine AS production

WORKDIR /app

# Install serve to serve static files
RUN npm install -g serve

# Copy built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Expose production port
EXPOSE 3000

# Start production server
CMD ["serve", "-s", "dist", "-l", "3000"]

# Stage 4: Development
FROM deps AS development

WORKDIR /app

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
