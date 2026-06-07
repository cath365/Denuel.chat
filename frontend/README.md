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

## Production environment

```dotenv
CHAT_API_URL=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_API=https://chat.denuelchat.com
NEXT_PUBLIC_CHAT_WS_URL=wss://chat.denuelchat.com/websocket
NEXT_PUBLIC_APP_URL=https://app.denuelchat.com
NEXT_PUBLIC_APP_NAME=Denuel Chat
SESSION_COOKIE_NAME=denuel_chat_session
```
