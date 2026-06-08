export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Denuel Chat',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  firebaseStorageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  firebaseMessagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};
