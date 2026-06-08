'use client';

import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signOut,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { env } from '../lib/env';
import { auth, db } from '../lib/firebase';

const getFriendlyAuthError = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error
      ? error.message
      : 'Authentication failed. Please try again.';
  }

  switch (error.code) {
    case 'auth/configuration-not-found':
      return 'Firebase Email/Password sign-in is not enabled yet. Open Firebase Console -> Authentication -> Sign-in method, then enable Email/Password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'That email is already registered. Try signing in instead.';
    case 'auth/weak-password':
      return 'Use a stronger password with at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    default:
      return error.message;
  }
};

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsPending(true);

    try {
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const normalizedEmail = email.trim().toLowerCase();
        const isPrimaryAdmin =
          normalizedEmail === env.primaryAdminEmail.trim().toLowerCase();

        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });

        await setDoc(doc(db, 'users', credential.user.uid), {
          email: normalizedEmail,
          displayName: displayName.trim(),
          createdAt: serverTimestamp(),
          accountStatus: 'active',
          workspaceRole: isPrimaryAdmin ? 'admin' : 'member',
        });
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const userReference = doc(db, 'users', credential.user.uid);
        const userSnapshot = await getDoc(userReference);
        const normalizedEmail = (credential.user.email || email).trim().toLowerCase();
        const isPrimaryAdmin =
          normalizedEmail === env.primaryAdminEmail.trim().toLowerCase();
        const accountStatus = userSnapshot.data()?.accountStatus;

        if (accountStatus === 'suspended') {
          await signOut(auth);
          throw new Error('This account has been suspended by an administrator.');
        }

        await setDoc(
          userReference,
          {
            email: normalizedEmail,
            displayName:
              credential.user.displayName || userSnapshot.data()?.displayName || normalizedEmail,
            accountStatus: accountStatus || 'active',
            workspaceRole:
              userSnapshot.data()?.workspaceRole || (isPrimaryAdmin ? 'admin' : 'member'),
            lastLoginAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      router.push('/chat');
    } catch (caughtError) {
      setError(getFriendlyAuthError(caughtError));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form className='form' onSubmit={handleSubmit}>
      {mode === 'register' ? (
        <input
          className='input'
          type='text'
          placeholder='Display name'
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      ) : null}
      <input
        className='input'
        type='email'
        placeholder='Email address'
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <input
        className='input'
        type='password'
        placeholder='Password'
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <button className='button' type='submit' disabled={isPending}>
        {isPending
          ? 'Please wait...'
          : mode === 'login'
            ? 'Sign in'
            : 'Create account'}
      </button>
      <button
        className='button secondary'
        type='button'
        onClick={() =>
          setMode((current) => (current === 'login' ? 'register' : 'login'))
        }
      >
        {mode === 'login'
          ? 'Need an account? Register'
          : 'Already have an account? Sign in'}
      </button>
      {error ? <div className='auth-error'>{error}</div> : null}
    </form>
  );
}
