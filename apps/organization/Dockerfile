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
COPY apps/organization ./apps/organization
COPY libs ./libs

# Build the organization service
RUN npm run build organization

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist/apps/organization ./dist/apps/organization
COPY --from=builder /app/libs ./libs

# Set environment variables
ENV NODE_ENV=production
ENV ORGANIZATION_SERVICE_PORT=3005

# Expose port
EXPOSE 3005

# Start the application
CMD ["node", "dist/apps/organization/main.js"]
