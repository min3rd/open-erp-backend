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
COPY apps/user ./apps/user
COPY libs ./libs

# Build the user service
RUN npm run build user

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/user ./dist/apps/user
COPY --from=builder /app/libs ./libs

# Set environment variables
ENV NODE_ENV=production
ENV USER_SERVICE_PORT=3002

# Expose port
EXPOSE 3002

# Start the application
CMD ["node", "dist/apps/user/main.js"]
