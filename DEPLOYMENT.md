# Denuel Chat Deployment Guide

## Important repo note

This repository is the Rocket.Chat Electron client, not the main Rocket.Chat server source tree. The backend in this setup uses the official Rocket.Chat container image and a production-oriented Docker stack.

## Local backend

1. Copy the env file:

```bash
cp .env.example .env
```

2. Start Rocket.Chat and MongoDB:

```bash
docker compose up -d mongo mongo-init-replica rocketchat
```

3. Visit:

```text
http://localhost:3000
```

4. Create the admin user in the setup wizard.

5. Apply the Denuel Chat brand assets:

```bash
export RC_ADMIN_PASSWORD='your-admin-password'
bash deploy/scripts/apply-branding.sh
```

## Production on a VPS

1. Provision Ubuntu 22.04 or 24.04 on DigitalOcean, AWS EC2, or another VPS.
2. Point `chat.example.com` to the server IP.
3. Install Docker and Docker Compose.
4. Copy this project to the server.
5. Set a real `.env`.
6. Place TLS certs in `deploy/nginx/certs/fullchain.pem` and `deploy/nginx/certs/privkey.pem`.
7. Start the stack:

```bash
docker compose --profile edge up -d
```

8. Lock down the server firewall to `22`, `80`, and `443`.

## Render or Railway

- Use the `rocketchat` service from the compose file as the app service.
- Prefer a managed MongoDB instance instead of the bundled container.
- Set `ROOT_URL` to the provider URL.
- Skip the `nginx` service because Render and Railway terminate TLS for you.
- Confirm WebSocket support is enabled on the service. Rocket.Chat realtime traffic depends on `/websocket`.

## WebSocket checklist

- Reverse proxies must forward `Upgrade` and `Connection` headers.
- `ROOT_URL` must match the public HTTPS URL exactly.
- If you deploy behind Nginx, use the included config in `deploy/nginx/default.conf`.
- If you deploy on Vercel for the frontend, the frontend should connect to Rocket.Chat directly with `wss://your-domain/websocket`.

## Security baseline

- Use long random values for all secrets in `.env`.
- Terminate TLS with Nginx or your cloud platform.
- Keep `Site_Name` and `Site_Url` enforced with `OVERWRITE_SETTING_*`.
- Do not expose MongoDB publicly.
- Restrict server access with a firewall and SSH keys.
- Rotate admin credentials after initial setup.

## Optional frontend on Vercel

The `frontend/` folder contains a Next.js scaffold that:

- authenticates against Rocket.Chat REST `/api/v1/login`
- stores the Rocket.Chat token in an `httpOnly` cookie
- demonstrates a realtime WebSocket handshake against `/websocket`

### Local frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Vercel frontend variables

Set these in Vercel:

```text
ROCKETCHAT_URL=https://chat.example.com
NEXT_PUBLIC_APP_NAME=Denuel Chat
NEXT_PUBLIC_ROCKETCHAT_WS_URL=wss://chat.example.com/websocket
SESSION_COOKIE_NAME=denuel_chat_session
```

## Desktop client branding

After you install dependencies in this repo, regenerate the derived Electron assets with:

```bash
node .yarn/releases/yarn-4.0.2.cjs build-assets
node .yarn/releases/yarn-4.0.2.cjs build
```
