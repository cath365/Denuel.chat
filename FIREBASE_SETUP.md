# Denuel Chat Firebase Setup

This is the new architecture for Denuel Chat:

```text
Next.js on Vercel
  -> Firebase Authentication
  -> Cloud Firestore
```

## 1. Create a Firebase project

1. Open the Firebase console.
2. Create a project called `Denuel Chat`.
3. Add a Web app.
4. Copy the Firebase web config values.

## 2. Enable Authentication

In Firebase Console:

1. Go to `Authentication`.
2. Click `Get started`.
3. Enable `Email/Password`.

## 3. Enable Firestore

In Firebase Console:

1. Go to `Firestore Database`.
2. Create a database.
3. Start in production mode.
4. Pick the region closest to your users.

## 4. Add environment variables

For local:

```bash
cd frontend
cp .env.local.example .env.local
```

Fill in:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBAYgdj3g8JN58vIAqgYY7pobYguhI0M1Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=denuel-chat.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=denuel-chat
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=denuel-chat.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=386994886508
NEXT_PUBLIC_FIREBASE_APP_ID=1:386994886508:web:4d6468d66d207cadaf0549
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Denuel Chat
```

For Vercel, set the same values in project environment variables, but use:

```dotenv
NEXT_PUBLIC_APP_URL=https://app.denuelchat.com
```

## 5. Apply Firestore rules

Copy the rules from:

- `frontend/firebase.rules`

into the Firestore Rules editor and publish them.

## 6. Run locally

```bash
cd frontend
npm install
npm run dev:local
```

Open:

```text
http://localhost:3001
```

## 7. Deploy to Vercel

1. Import the GitHub repo into Vercel.
2. Set the root directory to `frontend`.
3. Add the Firebase environment variables.
4. Deploy.
5. Add the custom domain:
   `app.denuelchat.com`

## 8. Notes

- Denuel Chat now runs fully on Firebase for auth and realtime messaging.
- Firestore handles realtime updates via snapshot listeners.
- Firebase Auth handles sign-up and sign-in.
