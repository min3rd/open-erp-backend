# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/auth ./apps/auth
COPY libs ./libs

# Build the auth service
RUN npm run build auth

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/auth ./dist/apps/auth
COPY --from=builder /app/libs ./libs

# Set environment variables
ENV NODE_ENV=production
ENV AUTH_SERVICE_PORT=3001

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/apps/auth/main.js"]
