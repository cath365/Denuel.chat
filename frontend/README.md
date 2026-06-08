# Denuel Chat Web

This frontend is now a custom Firebase-powered chat app.

## Stack

- Next.js App Router
- Firebase Authentication
- Cloud Firestore realtime listeners
- Firebase Storage attachments
- Vercel deployment

## Current feature set

- channels and direct messages
- live presence
- richer user profiles with status and avatar uploads
- typing indicators
- read receipts
- unread room counts
- emoji reactions
- pinned messages
- message editing and soft delete
- threaded replies
- channel member roles
- in-app notifications
- email invitation flow
- file and image attachments
- searchable workspace navigation

## Local development

```bash
cp .env.local.example .env.local
npm install
npm run dev:local
```

## Required Firebase env vars

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBAYgdj3g8JN58vIAqgYY7pobYguhI0M1Y
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=denuel-chat.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=denuel-chat
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=denuel-chat.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=386994886508
NEXT_PUBLIC_FIREBASE_APP_ID=1:386994886508:web:4d6468d66d207cadaf0549
NEXT_PUBLIC_APP_URL=https://app.denuelchat.com
NEXT_PUBLIC_APP_NAME=Denuel Chat
```

## Firestore structure

- `users/{uid}`
- `rooms/{roomId}`
- `rooms/{roomId}/messages/{messageId}`

## Rules

Deploy the sample Firestore rules from `firebase.rules`.
Deploy the sample Storage rules from `storage.rules`.
