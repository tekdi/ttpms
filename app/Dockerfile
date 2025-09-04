# TPPMS Backend - Environment-Driven Docker Build
# Supports development and production modes via build target

# ======================
# Stage 1: Base Python Environment
# ======================
FROM python:3.11-slim AS base
LABEL maintainer="TPPMS Team"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r tppms && useradd -r -g tppms -d /app -s /sbin/nologin tppms

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# ======================
# Stage 2: Development Dependencies
# ======================
FROM base AS dev-deps
RUN pip install -r requirements.txt
# Install development tools
RUN pip install pytest pytest-asyncio black flake8 mypy

# ======================
# Stage 3: Production Dependencies
# ======================
FROM base AS prod-deps
RUN pip install --no-cache-dir -r requirements.txt

# ======================
# Stage 4: Development Environment
# ======================
FROM base AS development
COPY --from=dev-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dev-deps /usr/local/bin /usr/local/bin

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R tppms:tppms /app

# Switch to non-root user
USER tppms

# Expose port
EXPOSE 8000

# Development environment variables
ENV ENVIRONMENT=development
ENV DEBUG=true

# Start development server with auto-reload
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ======================
# Stage 5: Production Environment
# ======================
FROM base AS production
COPY --from=prod-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=prod-deps /usr/local/bin /usr/local/bin

# Copy source code
COPY . .

# Change ownership to non-root user
RUN chown -R tppms:tppms /app

# Switch to non-root user
USER tppms

# Expose port
EXPOSE 8000

# Production environment variables
ENV ENVIRONMENT=production
ENV DEBUG=false

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start production server
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
