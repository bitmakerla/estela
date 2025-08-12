#!/bin/bash
set -e

echo "=== Starting Docker-in-Docker Setup ==="

# Ensure we have proper permissions and directories
mkdir -p /var/lib/docker
mkdir -p /var/log

echo "Starting Docker daemon for Docker-in-Docker..."

# Start Docker daemon in the background with proper DinD settings
echo "Starting Docker daemon with vfs storage driver (Kubernetes compatible)..."
dockerd \
    --host=unix:///var/run/docker.sock \
    --storage-driver=vfs \
    --log-level=info \
    --insecure-registry=0.0.0.0/0 \
    > /var/log/docker.log 2>&1 &

DOCKER_PID=$!
echo "Docker daemon started with PID: $DOCKER_PID"

# Wait for Docker daemon to be ready with more aggressive checking
echo "Waiting for Docker daemon to be ready..."
max_attempts=120  # Increased timeout
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker version >/dev/null 2>&1; then
        echo "✓ Docker daemon is ready!"
        echo "Docker version: $(docker --version)"
        break
    fi
    
    # Check if Docker process is still running
    if ! kill -0 $DOCKER_PID 2>/dev/null; then
        echo "ERROR: Docker daemon process died"
        echo "Docker daemon logs:"
        cat /var/log/docker.log
        exit 1
    fi
    
    attempt=$((attempt + 1))
    echo "Waiting for Docker... (attempt $attempt/$max_attempts)"
    sleep 3
done

if [ $attempt -eq $max_attempts ]; then
    echo "ERROR: Docker daemon failed to start after $max_attempts attempts"
    echo "Docker daemon logs:"
    cat /var/log/docker.log
    echo "Docker process status:"
    ps aux | grep docker || true
    exit 1
fi

# Test Docker functionality
echo "Testing Docker functionality..."
if docker info >/dev/null 2>&1; then
    echo "✓ Docker info command works"
else
    echo "WARNING: Docker info failed"
    docker info || true
fi

echo "=== Docker-in-Docker setup complete ==="
echo "Executing command: $@"

# Execute the main command
exec "$@"