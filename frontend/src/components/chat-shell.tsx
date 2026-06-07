'use client';

import { useEffect, useState } from 'react';

import { env } from '../lib/env';
import type { SessionPayload } from '../lib/session';

type ChatShellProps = {
  session: SessionPayload;
};

export function ChatShell({ session }: ChatShellProps) {
  const [status, setStatus] = useState<'connecting' | 'live' | 'closed'>('connecting');

  useEffect(() => {
    const socket = new WebSocket(env.websocketUrl);

    socket.addEventListener('open', () => {
      socket.send(
        JSON.stringify({
          msg: 'connect',
          version: '1',
          support: ['1'],
        })
      );
    });

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);

      if (payload.msg === 'connected') {
        socket.send(
          JSON.stringify({
            msg: 'method',
            method: 'login',
            id: 'login-resume',
            params: [{ resume: session.authToken }],
          })
        );
      }

      if (payload.msg === 'ping') {
        socket.send(JSON.stringify({ msg: 'pong' }));
      }

      if (payload.msg === 'result' && payload.id === 'login-resume') {
        setStatus('live');
      }
    });

    socket.addEventListener('close', () => {
      setStatus('closed');
    });

    return () => {
      socket.close();
    };
  }, [session.authToken]);

  return (
    <div className='grid'>
      <div className='status'>
        <span className={`dot ${status === 'live' ? 'live' : ''}`} />
        <span>Realtime session: {status}</span>
      </div>

      <div className='card panel'>
        <h2 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>Authenticated session</h2>
        <div className='meta'>
          <div className='meta-item'>
            <strong>User ID</strong>
            <div>{session.userId}</div>
          </div>
          <div className='meta-item'>
            <strong>Username</strong>
            <div>{session.username}</div>
          </div>
          <div className='meta-item'>
            <strong>Next step</strong>
            <div>
              Add REST proxies for rooms and messages, then subscribe to the
              relevant realtime streams from this shell.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
