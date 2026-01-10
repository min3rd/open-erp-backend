# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy source code
COPY apps/common-service ./apps/common-service
COPY libs ./libs

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build:common-service

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/libs ./libs

# Expose port
EXPOSE 3006

# Set environment variables
ENV NODE_ENV=production
ENV COMMON_SERVICE_PORT=3006

# Run the application
CMD ["node", "dist/apps/common-service/main.js"]
