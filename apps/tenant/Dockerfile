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
COPY apps/tenant ./apps/tenant
COPY libs ./libs

# Build the tenant service
RUN npm run build tenant

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/tenant ./dist/apps/tenant
COPY --from=builder /app/libs ./libs

# Set environment variables
ENV NODE_ENV=production
ENV TENANT_SERVICE_PORT=3005

# Expose port
EXPOSE 3005

# Start the application
CMD ["node", "dist/apps/tenant/main.js"]
