FROM node:20-alpine AS builder

WORKDIR /app

# Add build argument to force rebuilds when needed
ARG CACHE_BUST=1

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --network-timeout=100000 --no-fund --loglevel=error

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --network-timeout=100000 --no-fund --loglevel=error --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy necessary files for runtime
COPY --from=builder /app/src/rehouzd/estimator/config /app/dist/rehouzd/estimator/config

# Add script for handling Azure Key Vault integration
COPY ./scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 5004

# Set Node environment to production
ENV NODE_ENV=production

# Start the application with the script that can handle Key Vault integration
CMD ["/app/start.sh"] 