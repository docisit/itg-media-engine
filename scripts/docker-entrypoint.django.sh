#!/bin/bash
# ===========================================================
# Django Docker Entrypoint
#   Runs migrations, then starts Gunicorn + Daphne in parallel.
#   Gunicorn handles HTTP API on port 8000.
#   Daphne handles WebSocket connections on port 8001.
# ===========================================================
set -e

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Starting Gunicorn (HTTP API) on :8000..."
gunicorn backend.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - &

echo "==> Starting Daphne (WebSocket) on :8001..."
daphne -b 0.0.0.0 -p 8001 backend.asgi:application &

echo "==> Django ready — HTTP :8000 / WS :8001"

# Wait for any process to exit
wait -n