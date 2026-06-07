import { env } from './env';

export const rocketChat = {
  loginUrl: `${env.chatApiServerUrl}/api/v1/login`,
  logoutUrl: `${env.chatApiServerUrl}/api/v1/logout`,
  meUrl: `${env.chatApiServerUrl}/api/v1/me`,
  websocketUrl: env.websocketUrl,
};
