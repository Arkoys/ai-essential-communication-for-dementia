# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build
FROM deps AS build

WORKDIR /app

COPY . .

# Vite reads frontend configuration while building the static bundle.
ARG VITE_API_PROXY_URL=/api
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG LLM_PROVIDER=harvard

ENV VITE_API_PROXY_URL=${VITE_API_PROXY_URL} \
    VITE_FIREBASE_API_KEY=${VITE_FIREBASE_API_KEY} \
    VITE_FIREBASE_AUTH_DOMAIN=${VITE_FIREBASE_AUTH_DOMAIN} \
    VITE_FIREBASE_PROJECT_ID=${VITE_FIREBASE_PROJECT_ID} \
    VITE_FIREBASE_STORAGE_BUCKET=${VITE_FIREBASE_STORAGE_BUCKET} \
    VITE_FIREBASE_MESSAGING_SENDER_ID=${VITE_FIREBASE_MESSAGING_SENDER_ID} \
    VITE_FIREBASE_APP_ID=${VITE_FIREBASE_APP_ID} \
    VITE_FIREBASE_FIRESTORE_DATABASE_ID=${VITE_FIREBASE_FIRESTORE_DATABASE_ID} \
    VITE_FIREBASE_MEASUREMENT_ID=${VITE_FIREBASE_MEASUREMENT_ID} \
    LLM_PROVIDER=${LLM_PROVIDER}

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
