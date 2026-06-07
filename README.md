# Denuel Chat

Denuel Chat is a rebranded Rocket.Chat deployment kit with:

- a white-labeled desktop client in this repository
- a production-ready Docker backend for Rocket.Chat + MongoDB
- an optional Next.js frontend scaffold for Vercel

## What is in this repo

- `docker-compose.yml`: Rocket.Chat, MongoDB replica set bootstrap, and optional Nginx edge
- `.env.example`: backend environment template
- `deploy/`: Mongo, branding, Nginx, and deployment helper scripts
- `frontend/`: optional Next.js frontend for Vercel
- `src/`: Electron desktop client branding updates

## Quick start

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Start the local backend:

```bash
docker compose up -d mongo mongo-init-replica rocketchat
```

3. Open Rocket.Chat at `http://localhost:3000`

4. Apply the Denuel Chat brand assets after creating the admin user:

```bash
bash deploy/scripts/apply-branding.sh
```

5. If you want the optional Vercel frontend:

```bash
cd frontend
npm install
npm run dev
```

## Production docs

Deployment and hosting instructions live in [DEPLOYMENT.md](./DEPLOYMENT.md).
