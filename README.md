# Denuel Chat

Denuel Chat is a white-labeled Rocket.Chat deployment with:

- Rocket.Chat backend at `https://chat.denuelchat.com`
- Next.js frontend at `https://app.denuelchat.com`
- DigitalOcean Droplet hosting for the backend
- Docker Compose for Rocket.Chat and MongoDB
- host-level Nginx + Let's Encrypt for HTTPS and WebSocket proxying

## Key files

- `docker-compose.yml`: production backend services
- `.env.example`: backend environment variables
- `deploy/nginx/chat.denuelchat.com.http.conf`: initial HTTP Nginx bootstrap config
- `deploy/nginx/chat.denuelchat.com.conf`: final HTTPS Nginx production config
- `deploy/scripts/apply-branding.sh`: applies the Denuel Chat site name and assets
- `frontend/.env.example`: Vercel and local frontend variables
- `DEPLOYMENT.md`: full DigitalOcean, DNS, firewall, SSL, and Vercel steps

## Fast path

1. Provision an Ubuntu 22.04 DigitalOcean Droplet.
2. Point `chat.denuelchat.com` to the Droplet IP.
3. Deploy the backend stack:

```bash
cp .env.example .env
docker compose pull
docker compose up -d
```

4. Install host Nginx and Certbot, then use the configs in `deploy/nginx/`.
5. Point `app.denuelchat.com` to Vercel and deploy the `frontend/` project.

## Frontend environment

The Next.js frontend uses:

```bash
NEXT_PUBLIC_CHAT_API=https://chat.denuelchat.com
```

The full frontend environment template is in `frontend/.env.example`.

## Backend environment

The backend keeps the base connection URI simple in `.env`:

```bash
ROOT_URL=https://chat.denuelchat.com
MONGO_URL=mongodb://mongo:27017/rocketchat
PORT=3000
```

The Docker Compose file appends the single-node replica set parameter for the
production-safe Rocket.Chat runtime.

## Production guide

Use [DEPLOYMENT.md](./DEPLOYMENT.md) for the exact step-by-step commands.
