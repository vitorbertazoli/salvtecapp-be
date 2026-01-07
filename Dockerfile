# Backend Dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy scripts directory for initialization
COPY --from=builder /app/scripts ./scripts

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads/logos

EXPOSE 3000

CMD ["npm", "run", "start:prod"]