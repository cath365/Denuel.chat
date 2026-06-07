export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Denuel Chat',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  chatApiUrl:
    process.env.NEXT_PUBLIC_CHAT_API || 'http://localhost:3000',
  chatApiServerUrl:
    process.env.CHAT_API_URL ||
    process.env.NEXT_PUBLIC_CHAT_API ||
    'http://localhost:3000',
  websocketUrl:
    process.env.NEXT_PUBLIC_CHAT_WS_URL ||
    'ws://localhost:3000/websocket',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'denuel_chat_session',
};
