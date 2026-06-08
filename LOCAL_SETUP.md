# Denuel Chat Local Setup

This project now runs as a Firebase-backed web app.

Local stack:

- Next.js app at `http://localhost:3001`
- Firebase Authentication
- Cloud Firestore

## 1. Enable Firebase services

In Firebase Console for `denuel-chat`:

1. Open `Authentication`
2. Enable `Email/Password`
3. Open `Firestore Database`
4. Create the database if it is not active yet
5. Publish the rules from `frontend/firebase.rules`

## 2. Start the frontend

From the frontend directory:

```powershell
cd C:\Users\emman\Documents\DENUEL-CHAT\DENUEL-CHAT\frontend
npm install
npm run dev:local
```

The local environment file is already prepared in:

- `frontend/.env.local`

## 3. Open the app

Visit:

```text
http://localhost:3001
```

You should see:

- Denuel Chat landing page
- Firebase email/password login
- Realtime rooms and messages from Firestore

## 4. Troubleshooting

If registration or login fails:

1. Confirm `Email/Password` is enabled in Firebase Auth
2. Confirm Firestore exists in the same Firebase project
3. Confirm the app is using the values in `frontend/.env.local`
4. Confirm Firestore rules were published

## 5. Stop the app

Press `Ctrl+C` in the frontend terminal.
