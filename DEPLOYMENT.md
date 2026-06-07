# Denuel Chat Production Deployment

This guide targets:

- Backend: `https://chat.denuelchat.com`
- Frontend: `https://app.denuelchat.com`
- Host: DigitalOcean Droplet running Ubuntu 22.04
- Reverse proxy: host Nginx
- SSL: Let's Encrypt via Certbot
- Backend runtime: Docker Compose
- Frontend runtime: Vercel

## 1. DNS configuration

Create these DNS records before SSL:

- `chat.denuelchat.com` -> `A` record -> your DigitalOcean Droplet IPv4 address
- `app.denuelchat.com` -> add the Vercel-provided target when you connect the frontend project

For Vercel, the most common subdomain target is:

- `app.denuelchat.com` -> `CNAME` -> `cname.vercel-dns.com`

Confirm DNS has propagated before requesting certificates.

## 2. Backend environment file

Copy the backend template:

```bash
cp .env.example .env
```

The backend template already matches your production domains:

```dotenv
BRAND_NAME=Denuel Chat
ROOT_URL=https://chat.denuelchat.com
PORT=3000
ROCKETCHAT_VERSION=8.4.2
MONGO_VERSION=8.0
MONGO_DB_NAME=rocketchat
MONGO_URL=mongodb://mongo:27017/rocketchat
MONGO_OPLOG_URL=mongodb://mongo:27017/local
INITIAL_USER=yes
ADMIN_USERNAME=admin
ADMIN_NAME=Denuel Admin
ADMIN_EMAIL=admin@denuelchat.com
ADMIN_PASS=change-this-admin-password
LETSENCRYPT_EMAIL=denuelinambao@gmail.com
```

Update `ADMIN_PASS` to a strong password before deployment.
The Compose file appends `?replicaSet=rs0` when Rocket.Chat starts so the
single-node Mongo replica set still works correctly in production.

## 3. DigitalOcean Droplet setup

SSH into the Droplet and run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release nginx certbot python3-certbot-nginx ufw jq
```

Install Docker Engine and the Compose plugin:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 4. Firewall setup

Allow SSH, HTTP, and HTTPS:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

## 5. Upload the project

Clone the repo on the Droplet:

```bash
git clone https://github.com/cath365/Denuel.chat.git
cd Denuel.chat
cp .env.example .env
```

Edit the secrets:

```bash
nano .env
```

At minimum, set a strong `ADMIN_PASS`.

## 6. Start Rocket.Chat and MongoDB

Pull and start the backend:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Check logs:

```bash
docker compose logs -f rocketchat
```

Rocket.Chat listens only on `127.0.0.1:3000`, which keeps it off the public internet until Nginx is in front of it.

## 7. Bootstrap Nginx before SSL

Create the ACME webroot and install the HTTP bootstrap config:

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/chat.denuelchat.com.http.conf /etc/nginx/sites-available/chat.denuelchat.com.conf
sudo ln -sf /etc/nginx/sites-available/chat.denuelchat.com.conf /etc/nginx/sites-enabled/chat.denuelchat.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

At this point:

- `http://chat.denuelchat.com` should proxy to Rocket.Chat
- WebSocket upgrade headers are already enabled

## 8. Request the Let's Encrypt certificate

Run Certbot:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d chat.denuelchat.com --email denuelinambao@gmail.com --agree-tos --no-eff-email
```

Confirm the certificate files exist:

```bash
sudo ls /etc/letsencrypt/live/chat.denuelchat.com/
```

## 9. Switch Nginx to the final HTTPS config

Install the production TLS config:

```bash
sudo cp deploy/nginx/chat.denuelchat.com.conf /etc/nginx/sites-available/chat.denuelchat.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

This config does all of the following:

- forces HTTP -> HTTPS redirect
- proxies Rocket.Chat to `127.0.0.1:3000`
- supports WebSockets with `Upgrade` and `Connection` headers
- adds secure headers without disabling chat camera and microphone access
- serves ACME challenges for renewal

## 10. Verify the backend

Check these URLs:

- `https://chat.denuelchat.com`
- `https://chat.denuelchat.com/api/info`

Check certificate renewal:

```bash
sudo certbot renew --dry-run
```

## 11. Apply the Denuel Chat branding

This setup avoids core source modification for backend branding. It uses Rocket.Chat settings and asset APIs instead.

Run:

```bash
export ROOT_URL=https://chat.denuelchat.com
export RC_ADMIN_USER=admin
export RC_ADMIN_PASSWORD='your-admin-password'
bash deploy/scripts/apply-branding.sh
```

This applies:

- `Site_Name = Denuel Chat`
- uploaded logo asset
- uploaded favicon asset

You can replace:

- `deploy/assets/logo.svg`
- `deploy/assets/favicon.svg`

and re-run the branding script at any time.

## 12. Vercel frontend deployment

The frontend project lives in `frontend/`.

### Local frontend variables

Create `frontend/.env.local` from the template:

```bash
cd frontend
cp .env.example .env.local
```

The frontend template is:

```dotenv
CHAT_API_URL=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_API=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_WS_URL=wss://chat.denuelchat.com/websocket
NEXT_PUBLIC_APP_URL=https://app.denuelchat.com
NEXT_PUBLIC_APP_NAME=Denuel Chat
SESSION_COOKIE_NAME=denuel_chat_session
```

### Deploy to Vercel

1. Push the repo to GitHub.
2. Import the repository into Vercel.
3. Set the project root to `frontend`.
4. Add these environment variables in Vercel:

```text
CHAT_API_URL=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_API=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_WS_URL=wss://chat.denuelchat.com/websocket
NEXT_PUBLIC_APP_URL=https://app.denuelchat.com
NEXT_PUBLIC_APP_NAME=Denuel Chat
SESSION_COOKIE_NAME=denuel_chat_session
```

5. Deploy.
6. In Vercel, add the custom domain `app.denuelchat.com`.
7. Create the required DNS record if Vercel asks for a specific value.

## 13. Security checklist

- Keep Rocket.Chat bound to `127.0.0.1:3000` only.
- Do not expose MongoDB ports publicly.
- Keep UFW limited to `22`, `80`, and `443`.
- Use strong admin credentials.
- Run `sudo certbot renew --dry-run` after the first certificate install.
- Keep Docker images updated:

```bash
docker compose pull
docker compose up -d
```

## 14. Useful commands

Start or refresh the backend:

```bash
docker compose up -d
```

Watch backend logs:

```bash
docker compose logs -f rocketchat
```

Restart Nginx:

```bash
sudo systemctl reload nginx
```

Check open firewall rules:

```bash
sudo ufw status numbered
```
