'use client';

import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { auth, db } from '../lib/firebase';

const getFriendlyAuthError = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return 'Authentication failed. Please try again.';
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

        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });

        await setDoc(doc(db, 'users', credential.user.uid), {
          email,
          displayName: displayName.trim(),
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
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
