# Production Dockerfile for Frontend
# Builds static files and serves them with nginx

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
