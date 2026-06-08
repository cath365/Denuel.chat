import Link from 'next/link';

import { BrandLockup } from '../../components/brand-lockup';
import { LoginForm } from '../../components/login-form';

export default function LoginPage() {
  return (
    <main className='hero'>
      <div className='shell grid hero-grid'>
        <section className='card panel'>
          <BrandLockup size='lg' subtitle='Account access' />
          <span className='eyebrow'>Authentication</span>
          <h1 className='title' style={{ fontFamily: 'var(--font-heading)' }}>
            Sign in to Denuel Chat
          </h1>
          <p className='subtitle'>
            This page uses Firebase Authentication for email and password sign
            in, then opens the Firestore-backed chat experience.
          </p>
          <div style={{ marginTop: 24 }}>
            <LoginForm />
          </div>
          <p className='auth-note'>
            If you see `configuration-not-found`, enable `Email/Password` in
            Firebase Console under `Authentication -&gt; Sign-in method`.
          </p>
        </section>

        <section className='card panel'>
          <div className='meta'>
            <div className='meta-item'>
              <strong>Security</strong>
              <div>Firebase Auth handles identity, and Firestore rules protect chat data.</div>
            </div>
            <div className='meta-item'>
              <strong>Backend auth</strong>
              <div>Firebase email/password authentication</div>
            </div>
            <div className='meta-item'>
              <strong>After login</strong>
              <div>Open the <Link href='/chat'>chat shell</Link> to verify realtime room updates.</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
