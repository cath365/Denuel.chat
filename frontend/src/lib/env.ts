export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Denuel Chat',
  rocketChatUrl: process.env.ROCKETCHAT_URL || 'http://localhost:3000',
  websocketUrl:
    process.env.NEXT_PUBLIC_ROCKETCHAT_WS_URL ||
    'ws://localhost:3000/websocket',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'denuel_chat_session',
};
