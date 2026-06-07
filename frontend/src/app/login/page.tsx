import Link from 'next/link';

import { LoginForm } from '../../components/login-form';

export default function LoginPage() {
  return (
    <main className='hero'>
      <div className='shell grid hero-grid'>
        <section className='card panel'>
          <span className='eyebrow'>Authentication</span>
          <h1 className='title' style={{ fontFamily: 'var(--font-heading)' }}>
            Sign in to Denuel Chat
          </h1>
          <p className='subtitle'>
            This page exchanges credentials with Rocket.Chat over HTTPS and
            stores the returned auth token in a secure `httpOnly` cookie.
          </p>
          <div style={{ marginTop: 24 }}>
            <LoginForm />
          </div>
        </section>

        <section className='card panel'>
          <div className='meta'>
            <div className='meta-item'>
              <strong>Security</strong>
              <div>Cookies are `httpOnly`, `sameSite=lax`, and `secure` in production.</div>
            </div>
            <div className='meta-item'>
              <strong>Backend auth</strong>
              <div>Rocket.Chat REST `/api/v1/login`</div>
            </div>
            <div className='meta-item'>
              <strong>After login</strong>
              <div>
                Open the <Link href='/chat'>chat shell</Link> to verify the realtime connection.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
