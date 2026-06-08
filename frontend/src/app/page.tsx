import Link from 'next/link';

import { BrandLockup } from '../components/brand-lockup';
import { env } from '../lib/env';

export default function HomePage() {
  return (
    <main className='hero home-page'>
      <div className='shell grid home-layout'>
        <section className='card panel home-hero-card'>
          <BrandLockup size='lg' subtitle='Realtime messaging' />
          <span className='eyebrow'>Welcome to Denuel Chat</span>
          <h1 className='title' style={{ fontFamily: 'var(--font-heading)' }}>
            Conversations that feel calm, fast, and ready for real work.
          </h1>
          <p className='subtitle'>
            {env.appName} gives your team a warm, professional space for
            channels, direct messages, file sharing, unread activity, and live
            collaboration without the clutter.
          </p>

          <div className='welcome-strip'>
            <span>Professional team chat</span>
            <span>Clean collaboration flow</span>
            <span>Built for daily use</span>
          </div>

          <div className='hero-actions'>
            <Link className='button' href='/login'>
              Open Denuel Chat
            </Link>
            <Link className='button secondary' href='/chat'>
              Explore workspace
            </Link>
          </div>

          <div className='home-kpis'>
            <div className='home-kpi'>
              <strong>Channels + DMs</strong>
              <span>Keep team updates and private conversations organized.</span>
            </div>
            <div className='home-kpi'>
              <strong>Presence + profiles</strong>
              <span>Show identity, status, and availability in a calmer team directory.</span>
            </div>
            <div className='home-kpi'>
              <strong>Pins + message controls</strong>
              <span>Save the important updates and keep conversations tidy as work evolves.</span>
            </div>
          </div>
        </section>

        <section className='card panel showcase-shell'>
          <div className='showcase-topline'>
            <span className='eyebrow'>Workspace preview</span>
            <span className='showcase-domain'>{env.appUrl}</span>
          </div>

          <div className='showcase-panel'>
            <div className='showcase-header'>
              <div>
                <strong>Today in Denuel Chat</strong>
                <div>Everything your team needs in one clear workspace.</div>
              </div>
              <span className='presence-pill presence-online'>7 online</span>
            </div>

            <div className='showcase-grid'>
              <div className='showcase-card'>
                <strong>Channels</strong>
                <div># product-design</div>
                <div># launch-room</div>
                <div># operations</div>
              </div>
              <div className='showcase-card'>
                <strong>Daily flow</strong>
                <div>Unread counts keep priorities visible.</div>
                <div>Pinned updates and edits keep context easy to trust.</div>
              </div>
            </div>

            <div className='activity-feed'>
              <div className='activity-item'>
                <span className='avatar-badge avatar-badge-small'>EI</span>
                <div>
                  <strong>Launch room</strong>
                  <span>Shared the final checklist and pinned the release notes.</span>
                </div>
              </div>
              <div className='activity-item'>
                <span className='avatar-badge avatar-badge-small'>DC</span>
                <div>
                  <strong>Support handoff</strong>
                  <span>Presence and read receipts kept the team aligned.</span>
                </div>
              </div>
              <div className='activity-item'>
                <span className='avatar-badge avatar-badge-small'>FC</span>
                <div>
                  <strong>Faster feedback</strong>
                  <span>Reactions, uploads, and DMs cut down on back-and-forth.</span>
                </div>
              </div>
            </div>
          </div>

          <div className='showcase-feature-row'>
            <div className='showcase-chip'>Firebase Auth</div>
            <div className='showcase-chip'>Cloud Firestore</div>
            <div className='showcase-chip'>Realtime presence</div>
            <div className='showcase-chip'>Secure attachments</div>
          </div>
        </section>
      </div>
    </main>
  );
}
