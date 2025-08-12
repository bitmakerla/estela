# Docker-in-Docker Build Setup for Kubernetes with Containerd

## Overview
This setup enables building Docker images within Kubernetes clusters that use containerd as the container runtime (instead of Docker).

## How Deploy Builds Work

1. **User triggers deployment** via Estela UI/API
2. **Django API creates Kubernetes Job** using `BUILD_PROJECT_IMAGE`
3. **Build pod starts** with privileged mode (required for Docker-in-Docker)
4. **Entrypoint script runs:**
   - Starts Docker daemon inside container with VFS storage driver
   - Waits for daemon to be ready
   - Executes `build.py`
5. **build.py process:**
   - Downloads project ZIP from S3
   - Extracts project files
   - Builds Docker image using project's `Dockerfile-estela`
   - Attempts to detect spiders (gracefully fails if timeout)
   - Pushes built image to ECR
   - Updates deployment status
6. **Pod completes** and is cleaned up automatically

## Changes Made

### 1. Dockerfile-build-project
- Based on `python:3.9-slim` with Docker CE installed
- Uses VFS storage driver for Kubernetes compatibility
- Includes Docker-in-Docker capability with proper entrypoint
- Verbose build logging for better debugging

### 2. entrypoint-dind.sh
- Starts Docker daemon inside the container
- Waits for daemon to be ready before executing build.py
- Provides proper error handling and logging

### 3. kubernetes.py
- Added privileged security context for build jobs (required for DinD)
- Added resource limits (2-4GB memory, 1-2 CPU cores)
- Build jobs now run with elevated privileges to allow Docker daemon

### 4. core/views.py
- Removed Docker socket volume mount (no longer needed)
- Build containers are now self-contained with their own Docker daemon

## Building the Image

```bash
# From the project root directory
docker build -f docker-conf/Dockerfile-build-dind -t your-registry/estela-build-project:latest .
docker push your-registry/estela-build-project:latest
```

## Environment Variables
Update your `BUILD_PROJECT_IMAGE` in settings to point to the new image:
```python
BUILD_PROJECT_IMAGE = "your-registry/estela-build-project:latest"
```

## Kubernetes Requirements

### Security Context
The build pods require privileged mode to run Docker-in-Docker:
```yaml
securityContext:
  privileged: true
```

### Resource Requirements
Recommended resources for build pods:
- Memory: 2-4GB
- CPU: 1-2 cores

## How It Works

1. When a deploy is triggered, the API creates a Kubernetes Job
2. The Job runs the build container with privileged mode
3. The entrypoint script starts Docker daemon inside the container
4. build.py uses the internal Docker daemon to:
   - Build the project image
   - Push to ECR
5. No dependency on host Docker socket or daemon

## Troubleshooting

### Docker daemon fails to start
- Check pod logs: `kubectl logs <pod-name>`
- Ensure the pod has privileged mode enabled
- Verify sufficient resources are allocated

### Build fails with permission errors
- Ensure the Kubernetes namespace allows privileged pods
- Check PodSecurityPolicy or PodSecurityStandards settings

### Image push fails
- Verify ECR credentials are correctly passed as environment variables
- Check network connectivity from the pod to ECR

## Security Considerations

- Build pods run with privileged mode - ensure proper RBAC controls
- Consider running build jobs in a dedicated namespace with restricted access
- Monitor resource usage to prevent resource exhaustion