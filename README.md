# Denuel Chat

Denuel Chat is a custom realtime chat application built with:

- Next.js on Vercel
- Firebase Authentication
- Cloud Firestore realtime data

Architecture:

```text
Frontend (Next.js on Vercel)
        ->
Cloud Firestore (real-time database)
        ->
Firebase Auth
```

## Key files

- `frontend/`: the Firebase-powered web app
- `frontend/.env.example`: production frontend environment variables
- `frontend/.env.local.example`: localhost frontend environment variables
- `frontend/firebase.rules`: starter Firestore security rules
- `FIREBASE_SETUP.md`: full Firebase + Vercel setup guide
- `LOCAL_SETUP.md`: local Firebase development steps

## Fast path

1. Enable Firebase Authentication with email/password.
2. Enable Cloud Firestore.
3. Publish the Firestore rules from `frontend/firebase.rules`.
4. Run the frontend locally:

```bash
cd frontend
npm install
npm run dev:local
```

5. Deploy `frontend/` to Vercel.
6. Add the custom domain `app.denuelchat.com`.

## Setup guide

Use [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for the exact Firebase and Vercel steps.
