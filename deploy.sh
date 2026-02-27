#!/bin/bash

# Green Lantern - Quick Deployment Script
# ========================================

set -e

echo "🚀 Green Lantern Deployment Script"
echo "===================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.production template..."
    cp .env.production .env
    echo "✅ Please edit .env file with your configuration"
    echo "   Then run this script again."
    exit 1
fi

# Ask deployment type
echo "Select deployment option:"
echo "1) Production (docker-compose.prod.yml)"
echo "2) Development (docker-compose.yml)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        COMPOSE_FILE="docker-compose.prod.yml"
        echo "📦 Deploying PRODUCTION environment..."
        ;;
    2)
        COMPOSE_FILE="docker-compose.yml"
        echo "🔧 Deploying DEVELOPMENT environment..."
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Pull latest code
echo ""
echo "📥 Pulling latest code..."
git pull origin main || echo "⚠️  Git pull failed or not a git repo"

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

# Build and start
echo ""
echo "🏗️  Building containers..."
docker-compose -f $COMPOSE_FILE build --no-cache

echo ""
echo "🚀 Starting services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services
echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check status
echo ""
echo "📊 Service Status:"
docker-compose -f $COMPOSE_FILE ps

# Show logs
echo ""
echo "📋 Recent logs:"
docker-compose -f $COMPOSE_FILE logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo ""
echo "📝 View logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "🔄 Restart:   docker-compose -f $COMPOSE_FILE restart"
echo "🛑 Stop:      docker-compose -f $COMPOSE_FILE down"
