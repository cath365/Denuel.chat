import Link from 'next/link';

import { env } from '../lib/env';

export default function HomePage() {
  return (
    <main className='hero'>
      <div className='shell grid hero-grid'>
        <section className='card panel'>
          <span className='eyebrow'>Secure messaging stack</span>
          <h1 className='title' style={{ fontFamily: 'var(--font-heading)' }}>
            {env.appName}
          </h1>
          <p className='subtitle'>
            A Vercel-ready frontend that authenticates against the Denuel Chat
            backend over REST and keeps a realtime WebSocket session open for
            live updates.
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
              <strong>Backend</strong>
              <div>{env.chatApiUrl}</div>
            </div>
            <div className='meta-item'>
              <strong>Frontend</strong>
              <div>{env.appUrl}</div>
            </div>
            <div className='meta-item'>
              <strong>WebSocket</strong>
              <div>{env.websocketUrl}</div>
            </div>
            <div className='meta-item'>
              <strong>Session cookie</strong>
              <div>{env.sessionCookieName}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
