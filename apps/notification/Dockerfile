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
COPY apps/notification ./apps/notification
COPY libs ./libs

# Build the notification service
RUN npm run build notification

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/notification ./dist/apps/notification
COPY --from=builder /app/libs ./libs

# Set environment variables
ENV NODE_ENV=production
ENV NOTIFICATION_SERVICE_PORT=3003

# Expose port
EXPOSE 3003

# Start the application
CMD ["node", "dist/apps/notification/main.js"]
