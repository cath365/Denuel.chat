# Denuel Chat Web

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

## What this scaffold does

- logs in against Rocket.Chat REST `/api/v1/login`
- stores the returned `authToken` and `userId` in an `httpOnly` cookie
- opens a realtime WebSocket connection to `/websocket`
- provides a clean place to add room, message, and presence APIs
