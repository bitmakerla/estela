#!/bin/bash
# =============================================================================
# Estela Docker Standalone - Installation Script
# =============================================================================
# This script sets up Estela without Kubernetes in about 15 minutes.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Header
echo -e "${BLUE}"
echo "============================================================================="
echo "                    ESTELA - Docker Standalone Installation                  "
echo "============================================================================="
echo -e "${NC}"

# Check prerequisites
info "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Please install Docker first."
    echo "  Visit: https://docs.docker.com/get-docker/"
    exit 1
fi
success "Docker is installed"

# Check Docker Compose
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed. Please install Docker Compose first."
    echo "  Visit: https://docs.docker.com/compose/install/"
    exit 1
fi
success "Docker Compose is installed"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    error "Docker daemon is not running. Please start Docker."
    exit 1
fi
success "Docker daemon is running"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Setup environment file
info "Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env

    # Generate a random secret key
    SECRET_KEY=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-secret-key-change-me-in-production/$SECRET_KEY/" .env
    else
        sed -i "s/your-secret-key-change-me-in-production/$SECRET_KEY/" .env
    fi
    success "Created .env file with generated secret key"
else
    warning ".env file already exists, skipping..."
fi

# Build images
info "Building Docker images (this may take a few minutes)..."
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

$COMPOSE_CMD build

success "Docker images built successfully"

# Start services
info "Starting services..."
$COMPOSE_CMD up -d

# Wait for services to be healthy
info "Waiting for services to be ready..."
echo ""

# Function to check if service is healthy
wait_for_service() {
    local service=$1
    local max_attempts=${2:-60}
    local attempt=1

    printf "  Waiting for %s..." "$service"

    while [ $attempt -le $max_attempts ]; do
        if docker inspect --format='{{.State.Health.Status}}' "estela-$service" 2>/dev/null | grep -q "healthy"; then
            echo -e " ${GREEN}ready${NC}"
            return 0
        fi
        # Fallback: check if container is running
        if docker inspect --format='{{.State.Status}}' "estela-$service" 2>/dev/null | grep -q "running"; then
            if [ $attempt -ge 10 ]; then
                echo -e " ${GREEN}running${NC}"
                return 0
            fi
        fi
        printf "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e " ${RED}timeout${NC}"
    return 1
}

# Wait for key services
wait_for_service "db" 30 || warning "Database may still be initializing..."
wait_for_service "mongodb" 30 || warning "MongoDB may still be initializing..."
wait_for_service "redis" 30 || warning "Redis may still be initializing..."
wait_for_service "minio" 30 || warning "MinIO may still be initializing..."

# Give the API a bit more time to start
info "Waiting for API to be ready..."
sleep 10

# Check if API is responding
for i in {1..30}; do
    if curl -s http://localhost:8000/api/ > /dev/null 2>&1; then
        success "API is ready!"
        break
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}=============================================================================${NC}"
echo -e "${GREEN}                    INSTALLATION COMPLETE!                                   ${NC}"
echo -e "${GREEN}=============================================================================${NC}"
echo ""
echo -e "  ${BLUE}Frontend:${NC}  http://localhost:3000"
echo -e "  ${BLUE}API:${NC}       http://localhost:8000"
echo -e "  ${BLUE}API Docs:${NC}  http://localhost:8000/api/docs/"
echo ""
echo -e "  ${BLUE}Default admin credentials:${NC}"
echo -e "    Username: ${YELLOW}admin${NC}"
echo -e "    Password: ${YELLOW}admin${NC}"
echo ""
echo -e "  ${BLUE}MinIO Console:${NC} http://localhost:9001"
echo -e "    Username: ${YELLOW}minioadmin${NC}"
echo -e "    Password: ${YELLOW}minioadmin${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} Change default passwords in production!"
echo ""
echo "To view logs:"
echo "  $COMPOSE_CMD logs -f"
echo ""
echo "To stop all services:"
echo "  $COMPOSE_CMD down"
echo ""
echo "To restart:"
echo "  $COMPOSE_CMD up -d"
echo ""
