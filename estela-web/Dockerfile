# =============================================================================
# Estela Web Frontend - Multi-stage Docker Build
# =============================================================================

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock* package-lock.json* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# Copy source code
COPY . .

# Build arguments for environment variables
ARG REACT_APP_API_BASE_URL=http://localhost:8000
ARG REGISTER_PAGE_ENABLED=true

ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REGISTER_PAGE_ENABLED=$REGISTER_PAGE_ENABLED

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx config for SPA routing
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
