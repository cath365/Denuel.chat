'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: formData.get('user'),
        password: formData.get('password'),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Login failed' }));
      setError(data.error || 'Login failed');
      setPending(false);
      return;
    }

    router.push('/chat');
    router.refresh();
  };

  return (
    <form className='form' onSubmit={handleSubmit}>
      <input className='input' type='text' name='user' placeholder='Username or email' required />
      <input className='input' type='password' name='password' placeholder='Password' required />
      <button className='button' type='submit' disabled={pending}>
        {pending ? 'Signing in...' : 'Sign in'}
      </button>
      {error ? <div style={{ color: '#fca5a5' }}>{error}</div> : null}
    </form>
  );
}
