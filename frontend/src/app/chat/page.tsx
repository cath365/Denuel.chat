import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { ChatShell } from '../../components/chat-shell';
import { env } from '../../lib/env';
import type { SessionPayload } from '../../lib/session';

export default async function ChatPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(env.sessionCookieName)?.value;

  if (!raw) {
    redirect('/login');
  }

  let session: SessionPayload;

  try {
    session = JSON.parse(raw) as SessionPayload;
  } catch {
    redirect('/login');
  }

  return (
    <main className='hero'>
      <div className='shell'>
        <ChatShell session={session} />
      </div>
    </main>
  );
}
