# Denuel Chat on Render

This guide deploys Denuel Chat with:

- Rocket.Chat as a Render web service
- MongoDB as a Render private service with a persistent disk
- `chat.denuelchat.com` on Render
- `app.denuelchat.com` on Vercel

## Important difference from the Droplet setup

On Render, you do not need host-level Nginx or Certbot.

Render handles:

- TLS certificate issuance and renewal
- HTTP to HTTPS redirects
- WebSocket proxying for web services
- public service edge routing

That means the DigitalOcean Nginx files stay useful for self-hosting, but the
Render path is simpler and more appropriate here.

## Files used for the Render deployment

- `render.yaml`
- `deploy/render/mongo/Dockerfile`
- `deploy/render/mongo/start-mongo.sh`
- `deploy/render/rocketchat/Dockerfile`
- `deploy/render/rocketchat/start-rocketchat.sh`
- `frontend/.env.example`

## 1. DNS

Set these records:

- `chat.denuelchat.com` -> add as a Render custom domain on the `denuel-chat` web service
- `app.denuelchat.com` -> point to Vercel, typically `cname.vercel-dns.com`

Render will show the exact DNS verification values in the dashboard when you add
the custom domain.

## 2. Create the Render Blueprint

1. Open Render.
2. Click `New` -> `Blueprint`.
3. Connect the GitHub repo:
   `https://github.com/cath365/Denuel.chat.git`
4. Render will detect `render.yaml`.
5. Review the services it plans to create:
   - `denuel-mongo` private service
   - `denuel-chat` web service

## 3. Set the required secrets in Render

Render will prompt for these because they are marked `sync: false`:

- `ADMIN_PASS`
- `RC_ADMIN_PASSWORD`

Use the same strong admin password for both on the initial setup.

## 4. How the backend works on Render

### MongoDB

- Runs as a private service
- Uses the official `mongo:8.0` image as the base
- Stores data on a persistent disk mounted at `/data/db`
- Self-initializes the single-node replica set `rs0`

### Rocket.Chat

- Runs as a public web service
- Uses the official `registry.rocket.chat/rocketchat/rocket.chat:8.4.2` image as the base
- Builds `MONGO_URL` and `MONGO_OPLOG_URL` at startup from the Mongo private host
- Exposes the app on Render's public edge using `PORT=10000`

## 5. Branding

Backend branding is still applied without modifying Rocket.Chat core source.

After the first successful backend deploy, use the Render shell for the
`denuel-chat` service or your local machine to run:

```bash
export ROOT_URL=https://chat.denuelchat.com
export RC_ADMIN_USER=admin
export RC_ADMIN_PASSWORD='your-admin-password'
bash deploy/scripts/apply-branding.sh
```

This sets:

- site name to `Denuel Chat`
- logo asset
- favicon asset

## 6. WebSockets on Render

Render supports WebSockets for web services. Your frontend should connect to:

```text
wss://chat.denuelchat.com/websocket
```

No custom Nginx layer is required for this on Render.

## 7. Frontend on Vercel

Import the same GitHub repository into Vercel, but set the project root to:

```text
frontend
```

Set these environment variables in Vercel:

```dotenv
CHAT_API_URL=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_API=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_WS_URL=wss://chat.denuelchat.com/websocket
NEXT_PUBLIC_APP_URL=https://app.denuelchat.com
NEXT_PUBLIC_APP_NAME=Denuel Chat
SESSION_COOKIE_NAME=denuel_chat_session
```

Then add the custom domain:

```text
app.denuelchat.com
```

## 8. Scaling notes

- The Mongo service uses a persistent disk, so keep it as a single instance.
- Start Rocket.Chat with one web instance.
- Scale the web service later only after confirming your Mongo setup and app
  behavior under load.

## 9. Operational cautions

Render's own docs note that persistent disks are not a substitute for database
backup tooling. For MongoDB recovery, use `mongodump` and `mongorestore` style
backups rather than relying only on disk snapshots.

## 10. Local and self-hosted setup

If you want to run the same system outside Render:

- use `docker-compose.yml` for local and VPS runs
- use `DEPLOYMENT.md` for the DigitalOcean + Nginx + Certbot path
