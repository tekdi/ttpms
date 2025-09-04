#!/bin/bash
# TPPMS React Frontend - Deployment Script

set -e

echo "🚀 Deploying TPPMS React Frontend..."

# Default values
ENVIRONMENT="production"
PORT="3000"
API_URL=""
COMPOSE_FILE="docker-compose.yml"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -a|--api-url)
      API_URL="$2"
      shift 2
      ;;
    -f|--file)
      COMPOSE_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  -e, --env       Environment (development|production) (default: production)"
      echo "  -p, --port      Frontend port (default: 3000)"
      echo "  -a, --api-url   API base URL"
      echo "  -f, --file      Docker compose file (default: docker-compose.yml)"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Set environment-specific defaults
if [ "$ENVIRONMENT" = "development" ]; then
  PORT=${PORT:-5173}
  COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.dev.yml}
  API_URL=${API_URL:-http://localhost:8000/api}
else
  PORT=${PORT:-3000}
  API_URL=${API_URL:-https://your-domain.com/api}
fi

echo "📋 Deployment Configuration:"
echo "   Environment: $ENVIRONMENT"
echo "   Port: $PORT"
echo "   API URL: $API_URL"
echo "   Compose File: $COMPOSE_FILE"
echo ""

# Create .env file for docker-compose
cat > .env << EOF
VITE_API_BASE_URL=$API_URL
VITE_ENVIRONMENT=$ENVIRONMENT
FRONTEND_PORT=$PORT
EOF

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f "$COMPOSE_FILE" up --build -d

# Show status
echo "📊 Container Status:"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Frontend available at: http://localhost:$PORT"
echo "📋 Environment: $ENVIRONMENT"

# Show logs
echo ""
echo "📝 Showing logs (press Ctrl+C to exit):"
docker-compose -f "$COMPOSE_FILE" logs -f
