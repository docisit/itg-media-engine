# 🛠️ Manual Setup Guide

> For Docker deployment, see the main [README.md](README.md).  
> This guide covers manual (PM2 / bare metal) installation.

---

## Prerequisites

- **Python 3.11+** with `venv`
- **Node.js 20+** with `npm`
- **Redis 7+** (required for WebSockets + LiveKit)
- **PostgreSQL 16+** (or SQLite for development)
- **LiveKit Server** (Docker or cloud — see [livekit.io](https://livekit.io))
- **Nginx** (for production HTTPS)

---

## 1. Clone & Setup Backend

```bash
git clone https://github.com/docisit/itg-media-engine.git
cd media-site

# Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# EDIT .env with your settings!
```

## 2. Configure Environment

Edit `.env` with your values. At minimum:

| Variable | Required | Notes |
|----------|----------|-------|
| `SECRET_KEY` | ✅ | Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `LIVEKIT_API_KEY` | ✅ | From LiveKit Cloud or your self-hosted server |
| `LIVEKIT_API_SECRET` | ✅ | From LiveKit Cloud or your self-hosted server |
| `ALLOWED_HOSTS` | ✅ | Your domain(s) |
| `DATABASE_URL` | Optional | Leave blank for SQLite |

## 3. Database & Migrations

```bash
# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput
```

## 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure frontend environment
cp .env.example .env.production
# Set NEXT_PUBLIC_API_URL to your Django API URL

# Build for production
npm run build
```

## 5. Setup Redis

```bash
# Install Redis (Ubuntu/Debian)
sudo apt install redis-server

# Edit config: /etc/redis/redis.conf
# Set a password if desired
# Ensure bind 127.0.0.1 (do NOT expose to network)

# Start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

## 6. Setup LiveKit

### Option A: LiveKit Cloud (Easiest)
1. Sign up at [cloud.livekit.io](https://cloud.livekit.io)
2. Create a project → copy API Key + Secret
3. Add to your `.env`

### Option B: Self-Hosted (Docker)
The LiveKit stack (server + egress + ingress) runs in Docker with host networking:

```bash
# On the LiveKit server machine:
cd /opt/livekit

# Create a livekit.yaml config file (see LiveKit docs)
# and docker-compose.yml for the LiveKit stack
docker compose up -d
```

## 7. Start Services (PM2)

Create an `ecosystem.config.js` file based on the `.env.example` template. It should define these services:

- **Django API** (Gunicorn) on port 8000
- **Daphne WebSocket** on port 8001
- **Next.js frontend** on port 3000

```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Verify
pm2 list
```

## 8. Setup Nginx

Create Nginx configs for your domain:

1. A main site config pointing to Next.js (`:3000`)
2. An API subdomain config proxying to Django (`:8000`)
3. A LiveKit subdomain config for WebRTC

See `docker/nginx/nginx.conf` for a reference configuration.

**SSL:** Use Let's Encrypt / Certbot.

Test your config:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🐳 Quick Docker Alternative

```bash
# Everything in one command:
cp .env.example .env
# Edit .env with your LiveKit keys and domain

docker compose up -d
docker exec mediasite-django python manage.py migrate
docker exec -it mediasite-django python manage.py createsuperuser
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Redis connection refused | Ensure Redis is running: `systemctl status redis` |
| WebRTC not working | Check LiveKit URL in `.env`; ensure TURN server is configured |
| 502 Bad Gateway | Django/Nginx not running: `pm2 list`, `systemctl status nginx` |
| Static files 404 | Run `python manage.py collectstatic` |
| WebSocket won't connect | Ensure Daphne is running on port 8001 |
