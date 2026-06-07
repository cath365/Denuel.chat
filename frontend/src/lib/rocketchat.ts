import { env } from './env';

export const rocketChat = {
  loginUrl: `${env.rocketChatUrl}/api/v1/login`,
  meUrl: `${env.rocketChatUrl}/api/v1/me`,
  websocketUrl: env.websocketUrl,
};
