# ===========================================================
# Dockerfile.nginx — Lightweight Nginx for HTTP/HTTPS routing
#
#   Note: This does NOT include RTMP. The bare-metal nginx
#   handles RTMP (port 1936) using its compiled-in RTMP module.
#   If you want RTMP in Docker later, use a custom build with
#   nginx-rtmp-module or the `nginx-rtmp` Docker image.
# ===========================================================

FROM nginx:1.27-alpine

# Create directories for Let's Encrypt challenges
RUN mkdir -p /var/www/html/.well-known/acme-challenge && \
    chmod -R 755 /var/www/html

# Remove default config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy our unified config
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/.well-known/acme-challenge/health-check || exit 1

# No EXPOSE needed — ports are mapped in docker-compose.yml
