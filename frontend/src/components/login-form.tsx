'use client';

import Link from 'next/link';

import { useFirebaseAuth } from './firebase-provider';
import { AuthForm } from './auth-form';

export function LoginForm() {
  const { user, isLoading } = useFirebaseAuth();

  if (isLoading) {
    return <div className='status'><span className='dot' /><span>Checking session...</span></div>;
  }

  if (user) {
    return (
      <div className='grid'>
        <div className='status'>
          <span className='dot live' />
          <span>Signed in as {user.displayName || user.email}</span>
        </div>
        <Link className='button' href='/chat'>
          Open chat
        </Link>
      </div>
    );
  }

  return <AuthForm />;
}
