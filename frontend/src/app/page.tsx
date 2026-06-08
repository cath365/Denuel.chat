import Link from 'next/link';

import { BrandLockup } from '../components/brand-lockup';
import { env } from '../lib/env';

export default function HomePage() {
  return (
    <main className='hero'>
      <div className='shell grid hero-grid'>
        <section className='card panel'>
          <BrandLockup size='lg' subtitle='Realtime messaging' />
          <span className='eyebrow'>Secure messaging stack</span>
          <h1 className='title' style={{ fontFamily: 'var(--font-heading)' }}>
            {env.appName}
          </h1>
          <p className='subtitle'>
            A Vercel-ready chat app powered by Firebase Authentication and
            Cloud Firestore for live rooms, messages, and presence-ready state.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className='button' href='/login'>
              Open login
            </Link>
            <Link className='button secondary' href='/chat'>
              Open chat shell
            </Link>
          </div>
        </section>

        <section className='card panel'>
          <div className='meta'>
            <div className='meta-item'>
              <strong>Realtime database</strong>
              <div>Cloud Firestore</div>
            </div>
            <div className='meta-item'>
              <strong>Frontend</strong>
              <div>{env.appUrl}</div>
            </div>
            <div className='meta-item'>
              <strong>Auth + sync</strong>
              <div>Firebase Auth + Firestore</div>
            </div>
            <div className='meta-item'>
              <strong>Project</strong>
              <div>{env.firebaseProjectId || 'Add Firebase env vars'}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
