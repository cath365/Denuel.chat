import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { env } from '../../../../lib/env';
import { rocketChat } from '../../../../lib/rocketchat';
import type { SessionPayload } from '../../../../lib/session';

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(rocketChat.loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await response.json();

  if (!response.ok || payload?.status !== 'success') {
    return NextResponse.json(
      { error: payload?.error || 'Unable to authenticate with Denuel Chat' },
      { status: 401 }
    );
  }

  const session: SessionPayload = {
    authToken: payload.data.authToken,
    userId: payload.data.userId,
    username: payload.data.me.username,
  };

  const cookieStore = await cookies();
  cookieStore.set(env.sessionCookieName, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return NextResponse.json({ success: true });
}
