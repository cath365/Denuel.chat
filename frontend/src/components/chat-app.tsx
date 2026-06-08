'use client';

import { signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  updateDoc,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { auth, db } from '../lib/firebase';
import type { Message, Room } from '../types/chat';
import { BrandLockup } from './brand-lockup';
import { useFirebaseAuth } from './firebase-provider';

const asRoom = (id: string, data: Record<string, unknown>): Room => ({
  id,
  name: String(data.name || 'Untitled room'),
  createdBy: String(data.createdBy || ''),
  createdByName: String(data.createdByName || 'Unknown'),
  lastMessageText:
    typeof data.lastMessageText === 'string' ? data.lastMessageText : undefined,
  createdAt:
    data.createdAt && typeof data.createdAt === 'object'
      ? (data.createdAt as Room['createdAt'])
      : null,
  updatedAt:
    data.updatedAt && typeof data.updatedAt === 'object'
      ? (data.updatedAt as Room['updatedAt'])
      : null,
});

const asMessage = (id: string, data: Record<string, unknown>): Message => ({
  id,
  text: String(data.text || ''),
  senderId: String(data.senderId || ''),
  senderName: String(data.senderName || 'Unknown'),
  createdAt:
    data.createdAt && typeof data.createdAt === 'object'
      ? (data.createdAt as Message['createdAt'])
      : null,
});

const formatTimestamp = (
  timestamp?: { seconds: number; nanoseconds: number } | null
) => {
  if (!timestamp) {
    return 'Sending...';
  }

  return new Date(timestamp.seconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function ChatApp() {
  const router = useRouter();
  const { user, isLoading } = useFirebaseAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [roomName, setRoomName] = useState('');
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    const roomsQuery = query(
      collection(db, 'rooms'),
      orderBy('updatedAt', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const nextRooms = snapshot.docs.map((room) =>
          asRoom(room.id, room.data())
        );
        setRooms(nextRooms);
        setSelectedRoomId((current) => current || nextRooms[0]?.id || null);
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return undefined;
    }

    const messagesQuery = query(
      collection(db, 'rooms', selectedRoomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(snapshot.docs.map((message) => asMessage(message.id, message.data())));
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, [selectedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !roomName.trim()) {
      return;
    }

    setIsCreatingRoom(true);
    setError('');

    try {
      const roomReference = await addDoc(collection(db, 'rooms'), {
        name: roomName.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Denuel User',
        lastMessageText: '',
      });

      setRoomName('');
      setSelectedRoomId(roomReference.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Room creation failed');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleSendMessage = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!user || !selectedRoomId || !messageText.trim()) {
      return;
    }

    setIsSendingMessage(true);
    setError('');

    try {
      await addDoc(collection(db, 'rooms', selectedRoomId, 'messages'), {
        text: messageText.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Denuel User',
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'rooms', selectedRoomId), {
        lastMessageText: messageText.trim(),
        updatedAt: serverTimestamp(),
      });

      setMessageText('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Message send failed');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className='card panel'>
        <div className='status'>
          <span className='dot' />
          <span>Loading Denuel Chat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='card panel'>
        <div className='status'>
          <span className='dot' />
          <span>Sign in from the login page to start chatting.</span>
        </div>
      </div>
    );
  }

  return (
    <div className='chat-layout'>
      <aside className='card panel chat-sidebar'>
        <div className='chat-sidebar-head'>
          <div>
            <BrandLockup subtitle='Live workspace' />
            <div className='eyebrow'>Signed in</div>
            <h2 style={{ margin: '12px 0 4px', fontFamily: 'var(--font-heading)' }}>
              {user.displayName || user.email}
            </h2>
          </div>
          <button className='button secondary slim' onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <form className='form' onSubmit={handleCreateRoom}>
          <input
            className='input'
            type='text'
            placeholder='New room name'
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            required
          />
          <button className='button' type='submit' disabled={isCreatingRoom}>
            {isCreatingRoom ? 'Creating...' : 'Create room'}
          </button>
        </form>

        <div className='room-list'>
          {rooms.map((room) => (
            <button
              key={room.id}
              className={`room-card ${room.id === selectedRoomId ? 'room-card-active' : ''}`}
              onClick={() => setSelectedRoomId(room.id)}
              type='button'
            >
              <strong>{room.name}</strong>
              <span>{room.lastMessageText || 'No messages yet'}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className='card panel chat-main'>
        <div className='chat-main-head'>
          <div>
            <div className='eyebrow'>Realtime chat</div>
            <h2 style={{ margin: '12px 0 4px', fontFamily: 'var(--font-heading)' }}>
              {selectedRoom?.name || 'Pick a room'}
            </h2>
          </div>
        </div>

        <div className='message-list'>
          {messages.length > 0 ? (
            messages.map((message) => (
              <article
                key={message.id}
                className={`message-card ${
                  message.senderId === user.uid ? 'message-card-own' : ''
                }`}
              >
                <div className='message-meta'>
                  <strong>{message.senderName}</strong>
                  <span>{formatTimestamp(message.createdAt)}</span>
                </div>
                <div>{message.text}</div>
              </article>
            ))
          ) : (
            <div className='empty-state'>
              {selectedRoomId
                ? 'No messages yet. Send the first one.'
                : 'Create a room to start chatting.'}
            </div>
          )}
        </div>

        <form className='chat-compose' onSubmit={handleSendMessage}>
          <input
            className='input'
            type='text'
            placeholder='Write a message'
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            disabled={!selectedRoomId}
            required
          />
          <button
            className='button'
            type='submit'
            disabled={!selectedRoomId || isSendingMessage}
          >
            {isSendingMessage ? 'Sending...' : 'Send'}
          </button>
        </form>

        {error ? <div style={{ color: '#fca5a5' }}>{error}</div> : null}
      </section>
    </div>
  );
}
