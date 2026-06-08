import { NextResponse } from 'next/server';

type InvitePayload = {
  email?: string;
  inviteUrl?: string;
  inviterName?: string;
  roomName?: string;
  role?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as InvitePayload;
  const email = payload.email?.trim();
  const inviteUrl = payload.inviteUrl?.trim();
  const inviterName = payload.inviterName?.trim() || 'Denuel Chat';
  const roomName = payload.roomName?.trim() || 'your workspace';
  const role = payload.role?.trim() || 'member';

  if (!email || !inviteUrl) {
    return NextResponse.json(
      { error: 'Missing email or invite URL.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;

  if (!apiKey || !from) {
    return NextResponse.json({
      sent: false,
      mode: 'fallback',
    });
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `You're invited to ${roomName} on Denuel Chat`,
      html: `
        <div style="font-family: Georgia, serif; color: #1a1712; line-height: 1.7;">
          <h2 style="margin-bottom: 8px;">You're invited to Denuel Chat</h2>
          <p><strong>${inviterName}</strong> invited you to join <strong>${roomName}</strong> as <strong>${role}</strong>.</p>
          <p>Open the invite below and sign in with this email address to join automatically.</p>
          <p>
            <a href="${inviteUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#b69255;color:#17120c;text-decoration:none;font-weight:700;">
              Open Denuel Chat
            </a>
          </p>
          <p style="color:#6e6454;">If the button does not open, use this link:<br /><a href="${inviteUrl}">${inviteUrl}</a></p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    return NextResponse.json(
      {
        error: body || 'Invite email send failed.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sent: true,
    mode: 'email',
  });
}
