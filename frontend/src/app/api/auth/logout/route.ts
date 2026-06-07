import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { env } from '../../../../lib/env';
import { rocketChat } from '../../../../lib/rocketchat';
import type { SessionPayload } from '../../../../lib/session';

export async function POST() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(env.sessionCookieName)?.value;

  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie) as SessionPayload;

      await fetch(rocketChat.logoutUrl, {
        method: 'POST',
        headers: {
          'X-Auth-Token': session.authToken,
          'X-User-Id': session.userId,
        },
        cache: 'no-store',
      });
    } catch {
      // Ignore logout propagation errors and still clear the local session.
    }
  }

  cookieStore.delete(env.sessionCookieName);
  return NextResponse.json({ success: true });
}
