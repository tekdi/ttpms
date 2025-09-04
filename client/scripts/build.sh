#!/bin/bash
# TPPMS React Frontend - Build Script

set -e

echo "🏗️  Building TPPMS React Frontend..."

# Default values
TAG="latest"
ENVIRONMENT="production"
API_URL="http://localhost:8000/api"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--tag)
      TAG="$2"
      shift 2
      ;;
    -e|--env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -a|--api-url)
      API_URL="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -t, --tag       Docker tag (default: latest)"
      echo "  -e, --env       Environment (default: production)"
      echo "  -a, --api-url   API base URL (default: http://localhost:8000/api)"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Set environment-specific variables
if [ "$ENVIRONMENT" = "production" ]; then
  DEBUG_MODE="false"
  CONSOLE_LOGS="false"
  APP_NAME="TPPMS"
elif [ "$ENVIRONMENT" = "development" ]; then
  DEBUG_MODE="true"
  CONSOLE_LOGS="true"
  APP_NAME="TPPMS (Dev)"
else
  DEBUG_MODE="false"
  CONSOLE_LOGS="true"
  APP_NAME="TPPMS (Staging)"
fi

echo "📋 Build Configuration:"
echo "   Tag: $TAG"
echo "   Environment: $ENVIRONMENT"
echo "   API URL: $API_URL"
echo "   Debug Mode: $DEBUG_MODE"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ ERROR: .env file not found!"
  echo "📝 Please create .env file with required variables:"
  echo "   cp env.example .env"
  echo "   nano .env"
  exit 1
fi

echo "📋 Loading environment variables from .env file..."
source .env

# Validate required environment variables
REQUIRED_VARS="VITE_API_BASE_URL VITE_GOOGLE_CLIENT_ID VITE_APP_NAME VITE_APP_DESCRIPTION VITE_APP_VERSION"
MISSING_VARS=""

for var in $REQUIRED_VARS; do
  if [ -z "${!var}" ]; then
    MISSING_VARS="$MISSING_VARS $var"
  fi
done

if [ ! -z "$MISSING_VARS" ]; then
  echo "❌ ERROR: Missing required environment variables:"
  for var in $MISSING_VARS; do
    echo "   - $var"
  done
  echo ""
  echo "📝 Please set these variables in your .env file"
  exit 1
fi

echo "✅ All required environment variables found"
echo ""

# Build the Docker image with all environment variables as build args
docker build \
  --target production \
  --build-arg VITE_API_BASE_URL="$VITE_API_BASE_URL" \
  --build-arg VITE_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" \
  --build-arg VITE_APP_NAME="$VITE_APP_NAME" \
  --build-arg VITE_APP_DESCRIPTION="$VITE_APP_DESCRIPTION" \
  --build-arg VITE_APP_VERSION="$VITE_APP_VERSION" \
  --build-arg VITE_DEBUG_MODE="$VITE_DEBUG_MODE" \
  --build-arg VITE_ENABLE_CONSOLE_LOGS="$VITE_ENABLE_CONSOLE_LOGS" \
  --build-arg VITE_API_TIMEOUT="$VITE_API_TIMEOUT" \
  --build-arg VITE_SESSION_TIMEOUT="$VITE_SESSION_TIMEOUT" \
  --build-arg VITE_ENABLE_GOOGLE_AUTH="$VITE_ENABLE_GOOGLE_AUTH" \
  --build-arg VITE_ENABLE_BENCH_SUMMARY="$VITE_ENABLE_BENCH_SUMMARY" \
  --build-arg VITE_ENABLE_ALLOCATION_MODAL="$VITE_ENABLE_ALLOCATION_MODAL" \
  --build-arg VITE_ITEMS_PER_PAGE="$VITE_ITEMS_PER_PAGE" \
  --build-arg VITE_MAX_UPLOAD_SIZE="$VITE_MAX_UPLOAD_SIZE" \
  -t "tppms-frontend:$TAG" \
  .

echo "✅ Build completed successfully!"
echo "🚀 Run with: docker run -p 3000:80 tppms-frontend:$TAG"
