import Link from 'next/link';

import { BrandLockup } from '../components/brand-lockup';
import { env } from '../lib/env';

export default function HomePage() {
  return (
    <main className='hero'>
      <div className='shell grid hero-grid'>
        <section className='card panel'>
          <BrandLockup size='lg' subtitle='Realtime messaging' />
          <span className='eyebrow'>Denuel workspace</span>
          <h1 className='title' style={{ fontFamily: 'var(--font-heading)' }}>
            {env.appName}
          </h1>
          <p className='subtitle'>
            A clean team chat app with channels, direct messages, presence, and
            file sharing, built for fast collaboration on the web.
          </p>
          <div className='meta'>
            <div className='meta-item'>
              <strong>Channels + DMs</strong>
              <div>Organize conversations by team space or private thread.</div>
            </div>
            <div className='meta-item'>
              <strong>Live presence</strong>
              <div>See who is online and jump straight into a direct message.</div>
            </div>
            <div className='meta-item'>
              <strong>Attachments</strong>
              <div>Share files and image previews right inside the conversation.</div>
            </div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className='button' href='/login'>
              Start chatting
            </Link>
            <Link className='button secondary' href='/chat'>
              View workspace
            </Link>
          </div>
        </section>

        <section className='card panel'>
          <div className='meta'>
            <div className='meta-item'>
              <strong>Realtime database</strong>
              <div>Cloud Firestore keeps rooms and messages synced live.</div>
            </div>
            <div className='meta-item'>
              <strong>Hosting</strong>
              <div>Next.js frontend deployed to {env.appUrl}</div>
            </div>
            <div className='meta-item'>
              <strong>Identity + storage</strong>
              <div>Firebase Auth for sign-in and Storage for shared files.</div>
            </div>
            <div className='meta-item'>
              <strong>Project</strong>
              <div>{env.firebaseProjectId || 'Connect Firebase to continue'}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
