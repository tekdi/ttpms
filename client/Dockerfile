# TPPMS React Frontend - Environment-Driven Docker Build
# Supports development and production modes via build target

# ======================
# Stage 1: Base Dependencies
# ======================
FROM node:18-alpine AS base
LABEL maintainer="TPPMS Team"

# Install security updates and required tools
RUN apk add --no-cache libc6-compat curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# ======================
# Stage 2: Development Dependencies
# ======================
FROM base AS dev-deps
RUN npm install

# ======================
# Stage 3: Production Dependencies  
# ======================
FROM base AS prod-deps
RUN npm ci --only=production && npm cache clean --force

# ======================
# Stage 4: Development Environment
# ======================
FROM base AS development
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Switch to non-root user
USER nextjs

# Expose Vite dev server port
EXPOSE 5173

# Development environment variables
ENV NODE_ENV=development

# Start development server with host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ======================
# Stage 5: Builder (for production)
# ======================
FROM base AS builder

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build args for environment variables (optional - can be passed at build time)
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_APP_NAME
ARG VITE_APP_DESCRIPTION
ARG VITE_APP_VERSION
ARG VITE_DEBUG_MODE
ARG VITE_ENABLE_CONSOLE_LOGS
ARG VITE_API_TIMEOUT
ARG VITE_SESSION_TIMEOUT
ARG VITE_ENABLE_GOOGLE_AUTH
ARG VITE_ENABLE_BENCH_SUMMARY
ARG VITE_ENABLE_ALLOCATION_MODAL
ARG VITE_ITEMS_PER_PAGE
ARG VITE_MAX_UPLOAD_SIZE

# Set environment variables from build args (only if provided)
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_DEBUG_MODE=$VITE_DEBUG_MODE
ENV VITE_ENABLE_CONSOLE_LOGS=$VITE_ENABLE_CONSOLE_LOGS
ENV VITE_API_TIMEOUT=$VITE_API_TIMEOUT
ENV VITE_SESSION_TIMEOUT=$VITE_SESSION_TIMEOUT
ENV VITE_ENABLE_GOOGLE_AUTH=$VITE_ENABLE_GOOGLE_AUTH
ENV VITE_ENABLE_BENCH_SUMMARY=$VITE_ENABLE_BENCH_SUMMARY
ENV VITE_ENABLE_ALLOCATION_MODAL=$VITE_ENABLE_ALLOCATION_MODAL
ENV VITE_ITEMS_PER_PAGE=$VITE_ITEMS_PER_PAGE
ENV VITE_MAX_UPLOAD_SIZE=$VITE_MAX_UPLOAD_SIZE

# Install all dependencies for building
RUN npm ci

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/

# ======================
# Stage 3: Production Runtime
# ======================
FROM nginx:1.25-alpine AS production
LABEL stage=production
LABEL maintainer="TPPMS Team"
LABEL description="TPPMS React Frontend"
LABEL version="1.0.0"

# Install security updates
RUN apk add --no-cache --upgrade \
    ca-certificates \
    && apk del --purge \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001 -G nodejs

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf.orig

# Note: Keep as root for nginx to manage pid file
# USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
