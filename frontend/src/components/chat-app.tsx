'use client';

import { signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { auth, db, storage } from '../lib/firebase';
import type {
  ChatReadState,
  ChatTypingState,
  ChatUser,
  Message,
  Room,
} from '../types/chat';
import { BrandLockup } from './brand-lockup';
import { useFirebaseAuth } from './firebase-provider';

const REACTION_OPTIONS = ['👍', '❤️', '😂', '🔥'];

const asRoom = (id: string, data: Record<string, unknown>): Room => ({
  id,
  kind: data.kind === 'direct' ? 'direct' : 'channel',
  name: String(data.name || 'Untitled room'),
  createdBy: String(data.createdBy || ''),
  createdByName: String(data.createdByName || 'Unknown'),
  lastMessageText:
    typeof data.lastMessageText === 'string' ? data.lastMessageText : undefined,
  lastMessageSenderId:
    typeof data.lastMessageSenderId === 'string'
      ? data.lastMessageSenderId
      : undefined,
  memberIds: Array.isArray(data.memberIds)
    ? data.memberIds.map((value) => String(value))
    : [],
  memberNames: Array.isArray(data.memberNames)
    ? data.memberNames.map((value) => String(value))
    : [],
  unreadCounts:
    data.unreadCounts && typeof data.unreadCounts === 'object'
      ? Object.fromEntries(
          Object.entries(data.unreadCounts as Record<string, unknown>).map(
            ([userId, count]) => [userId, Number(count) || 0]
          )
        )
      : {},
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
  attachmentName:
    typeof data.attachmentName === 'string' ? data.attachmentName : undefined,
  attachmentSize:
    typeof data.attachmentSize === 'number' ? data.attachmentSize : undefined,
  attachmentType:
    typeof data.attachmentType === 'string' ? data.attachmentType : undefined,
  attachmentUrl:
    typeof data.attachmentUrl === 'string' ? data.attachmentUrl : undefined,
  reactions:
    data.reactions && typeof data.reactions === 'object'
      ? Object.fromEntries(
          Object.entries(data.reactions as Record<string, unknown>).map(
            ([emoji, members]) => [
              emoji,
              members && typeof members === 'object'
                ? Object.fromEntries(
                    Object.entries(members as Record<string, unknown>).map(
                      ([userId, displayName]) => [userId, String(displayName)]
                    )
                  )
                : {},
            ]
          )
        )
      : {},
  createdAt:
    data.createdAt && typeof data.createdAt === 'object'
      ? (data.createdAt as Message['createdAt'])
      : null,
});

const asChatUser = (id: string, data: Record<string, unknown>): ChatUser => ({
  id,
  displayName: String(data.displayName || data.email || 'Denuel User'),
  email: String(data.email || ''),
  presenceStatus:
    data.presenceStatus === 'online' ||
    data.presenceStatus === 'away' ||
    data.presenceStatus === 'offline'
      ? data.presenceStatus
      : 'offline',
  lastSeenAt:
    data.lastSeenAt && typeof data.lastSeenAt === 'object'
      ? (data.lastSeenAt as ChatUser['lastSeenAt'])
      : null,
});

const asReadState = (
  userId: string,
  data: Record<string, unknown>
): ChatReadState => ({
  userId,
  displayName: String(data.displayName || 'Teammate'),
  lastReadMessageId:
    typeof data.lastReadMessageId === 'string' ? data.lastReadMessageId : '',
  lastReadAt:
    data.lastReadAt && typeof data.lastReadAt === 'object'
      ? (data.lastReadAt as ChatReadState['lastReadAt'])
      : null,
});

const asTypingState = (
  userId: string,
  data: Record<string, unknown>
): ChatTypingState => ({
  userId,
  displayName: String(data.displayName || 'Teammate'),
  isTyping: Boolean(data.isTyping),
  updatedAt:
    data.updatedAt && typeof data.updatedAt === 'object'
      ? (data.updatedAt as ChatTypingState['updatedAt'])
      : null,
});

const timestampToMs = (
  timestamp?: { seconds: number; nanoseconds: number } | null
) => {
  if (!timestamp) {
    return 0;
  }

  return timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1_000_000);
};

const formatTimestamp = (
  timestamp?: { seconds: number; nanoseconds: number } | null
) => {
  if (!timestamp) {
    return 'Sending...';
  }

  return new Date(timestampToMs(timestamp)).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDayLabel = (
  timestamp?: { seconds: number; nanoseconds: number } | null
) => {
  if (!timestamp) {
    return 'Now';
  }

  return new Date(timestampToMs(timestamp)).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const createDirectRoomId = (currentUserId: string, targetUserId: string) =>
  ['dm', ...[currentUserId, targetUserId].sort()].join('_');

const formatFileSize = (size?: number) => {
  if (!size) {
    return '';
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'D';

export function ChatApp() {
  const router = useRouter();
  const { user, isLoading } = useFirebaseAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<ChatUser[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [readStates, setReadStates] = useState<ChatReadState[]>([]);
  const [typingStates, setTypingStates] = useState<ChatTypingState[]>([]);
  const [roomName, setRoomName] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const roomsQuery = query(
      collection(db, 'rooms'),
      orderBy('updatedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        setRooms(snapshot.docs.map((room) => asRoom(room.id, room.data())));
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), limit(50));

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        setPeople(snapshot.docs.map((person) => asChatUser(person.id, person.data())));
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, []);

  const visibleRooms = useMemo(() => {
    if (!user) {
      return [];
    }

    return rooms.filter(
      (room) =>
        room.kind === 'channel' ||
        (room.memberIds || []).includes(user.uid)
    );
  }, [rooms, user]);

  useEffect(() => {
    setSelectedRoomId((current) => {
      if (current && visibleRooms.some((room) => room.id === current)) {
        return current;
      }

      return visibleRooms[0]?.id || null;
    });
  }, [visibleRooms]);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      setReadStates([]);
      setTypingStates([]);
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
        setMessages(
          snapshot.docs.map((message) => asMessage(message.id, message.data()))
        );
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) {
      return undefined;
    }

    const readStatesQuery = query(
      collection(db, 'rooms', selectedRoomId, 'readStates'),
      limit(50)
    );

    const unsubscribe = onSnapshot(readStatesQuery, (snapshot) => {
      setReadStates(
        snapshot.docs.map((stateDoc) => asReadState(stateDoc.id, stateDoc.data()))
      );
    });

    return unsubscribe;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) {
      return undefined;
    }

    const typingQuery = query(
      collection(db, 'rooms', selectedRoomId, 'typing'),
      limit(50)
    );

    const unsubscribe = onSnapshot(typingQuery, (snapshot) => {
      setTypingStates(
        snapshot.docs.map((stateDoc) =>
          asTypingState(stateDoc.id, stateDoc.data())
        )
      );
    });

    return unsubscribe;
  }, [selectedRoomId]);

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, selectedRoomId]);

  const selectedRoom = useMemo(
    () => visibleRooms.find((room) => room.id === selectedRoomId) || null,
    [selectedRoomId, visibleRooms]
  );

  useEffect(() => {
    if (!user || !selectedRoomId || !selectedRoom) {
      return undefined;
    }

    const latestMessageId = messages[messages.length - 1]?.id || '';

    const timeoutId = window.setTimeout(() => {
      const nextUnreadCounts = {
        ...(selectedRoom.unreadCounts || {}),
        [user.uid]: 0,
      };

      void setDoc(
        doc(db, 'rooms', selectedRoomId),
        { unreadCounts: nextUnreadCounts },
        { merge: true }
      );

      void setDoc(
        doc(db, 'rooms', selectedRoomId, 'readStates', user.uid),
        {
          displayName: user.displayName || user.email || 'Denuel User',
          lastReadAt: serverTimestamp(),
          lastReadMessageId: latestMessageId,
        },
        { merge: true }
      );
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [messages, selectedRoom, selectedRoomId, user]);

  useEffect(() => {
    if (!user || !selectedRoomId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void setDoc(
        doc(db, 'rooms', selectedRoomId, 'typing', user.uid),
        {
          displayName: user.displayName || user.email || 'Denuel User',
          isTyping: messageText.trim().length > 0,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [messageText, selectedRoomId, user]);

  const teammates = useMemo(
    () =>
      people
        .filter((person) => person.id !== user?.uid)
        .sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [people, user]
  );

  const onlineTeammates = useMemo(
    () => teammates.filter((person) => person.presenceStatus === 'online').length,
    [teammates]
  );

  const getDisplayName = (targetUserId: string) => {
    const match = teammates.find((person) => person.id === targetUserId);

    return match?.displayName || match?.email || 'Direct message';
  };

  const getRoomLabel = (room: Room) => {
    if (room.kind === 'channel') {
      return room.name;
    }

    const otherMemberId = (room.memberIds || []).find(
      (memberId) => memberId !== user?.uid
    );

    return otherMemberId ? getDisplayName(otherMemberId) : room.name;
  };

  const getUnreadCount = (room: Room) => {
    if (!user) {
      return 0;
    }

    return room.unreadCounts?.[user.uid] || 0;
  };

  const roomSearchValue = roomSearch.trim().toLowerCase();

  const filteredRooms = useMemo(() => {
    if (!roomSearchValue) {
      return visibleRooms;
    }

    return visibleRooms.filter((room) => {
      const haystack = [
        getRoomLabel(room),
        room.lastMessageText || '',
        ...(room.memberNames || []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(roomSearchValue);
    });
  }, [roomSearchValue, visibleRooms, teammates, user]);

  const filteredTeammates = useMemo(() => {
    if (!roomSearchValue) {
      return teammates;
    }

    return teammates.filter((person) =>
      `${person.displayName} ${person.email}`.toLowerCase().includes(roomSearchValue)
    );
  }, [roomSearchValue, teammates]);

  const channelRooms = useMemo(
    () => filteredRooms.filter((room) => room.kind === 'channel'),
    [filteredRooms]
  );

  const directRooms = useMemo(
    () => filteredRooms.filter((room) => room.kind === 'direct'),
    [filteredRooms]
  );

  const selectedDirectUser = useMemo(() => {
    if (!selectedRoom || selectedRoom.kind !== 'direct' || !user) {
      return null;
    }

    const otherMemberId = (selectedRoom.memberIds || []).find(
      (memberId) => memberId !== user.uid
    );

    return teammates.find((person) => person.id === otherMemberId) || null;
  }, [selectedRoom, teammates, user]);

  const activeTypingUsers = useMemo(() => {
    const now = Date.now();

    return typingStates.filter((typingState) => {
      if (typingState.userId === user?.uid || !typingState.isTyping) {
        return false;
      }

      return now - timestampToMs(typingState.updatedAt) < 9000;
    });
  }, [typingStates, user]);

  const latestOwnMessage = useMemo(
    () =>
      [...messages].reverse().find((message) => message.senderId === user?.uid) ||
      null,
    [messages, user]
  );

  const seenByNames = useMemo(() => {
    if (!latestOwnMessage) {
      return [];
    }

    const latestOwnMessageAt = timestampToMs(latestOwnMessage.createdAt);

    return readStates
      .filter((state) => state.userId !== user?.uid)
      .filter(
        (state) =>
          state.lastReadMessageId === latestOwnMessage.id ||
          timestampToMs(state.lastReadAt) >= latestOwnMessageAt
      )
      .map((state) => state.displayName);
  }, [latestOwnMessage, readStates, user]);

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !roomName.trim()) {
      return;
    }

    setIsCreatingRoom(true);
    setError('');

    try {
      const selfName = user.displayName || user.email || 'Denuel User';
      const roomReference = await addDoc(collection(db, 'rooms'), {
        kind: 'channel',
        name: roomName.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: selfName,
        memberIds: [user.uid],
        memberNames: [selfName],
        unreadCounts: { [user.uid]: 0 },
        lastMessageText: '',
        lastMessageSenderId: '',
      });

      setRoomName('');
      setSelectedRoomId(roomReference.id);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Room creation failed'
      );
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleOpenDirectMessage = async (targetUser: ChatUser) => {
    if (!user) {
      return;
    }

    setError('');

    const selfName = user.displayName || user.email || 'Denuel User';
    const roomId = createDirectRoomId(user.uid, targetUser.id);

    try {
      await setDoc(
        doc(db, 'rooms', roomId),
        {
          kind: 'direct',
          name: targetUser.displayName || targetUser.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          createdByName: selfName,
          memberIds: [user.uid, targetUser.id],
          memberNames: [selfName, targetUser.displayName || targetUser.email],
          unreadCounts: { [user.uid]: 0, [targetUser.id]: 0 },
          lastMessageText: '',
          lastMessageSenderId: '',
        },
        { merge: true }
      );

      setSelectedRoomId(roomId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Direct message setup failed'
      );
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedRoomId) {
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const messageReference = doc(
          db,
          'rooms',
          selectedRoomId,
          'messages',
          messageId
        );
        const messageSnapshot = await transaction.get(messageReference);

        if (!messageSnapshot.exists()) {
          return;
        }

        const data = messageSnapshot.data() as Record<string, unknown>;
        const reactions =
          data.reactions && typeof data.reactions === 'object'
            ? {
                ...(data.reactions as Record<string, Record<string, string>>),
              }
            : {};
        const currentReaction = { ...(reactions[emoji] || {}) };

        if (currentReaction[user.uid]) {
          delete currentReaction[user.uid];
        } else {
          currentReaction[user.uid] =
            user.displayName || user.email || 'Denuel User';
        }

        if (Object.keys(currentReaction).length > 0) {
          reactions[emoji] = currentReaction;
        } else {
          delete reactions[emoji];
        }

        transaction.update(messageReference, { reactions });
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Reaction update failed'
      );
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedRoomId || (!messageText.trim() && !selectedFile)) {
      return;
    }

    setIsSendingMessage(true);
    setError('');

    try {
      let attachmentName = '';
      let attachmentSize = 0;
      let attachmentType = '';
      let attachmentUrl = '';

      if (selectedFile) {
        const filePath = `chat-uploads/${selectedRoomId}/${Date.now()}-${user.uid}-${selectedFile.name}`;
        const uploadReference = ref(storage, filePath);
        const uploadResult = await uploadBytes(uploadReference, selectedFile);

        attachmentName = selectedFile.name;
        attachmentSize = selectedFile.size;
        attachmentType = selectedFile.type;
        attachmentUrl = await getDownloadURL(uploadResult.ref);
      }

      const trimmedText = messageText.trim();

      await addDoc(collection(db, 'rooms', selectedRoomId, 'messages'), {
        text: trimmedText,
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Denuel User',
        createdAt: serverTimestamp(),
        attachmentName,
        attachmentSize,
        attachmentType,
        attachmentUrl,
        reactions: {},
      });

      const recipientIds = Array.from(
        new Set(
          selectedRoom?.kind === 'direct'
            ? selectedRoom.memberIds || [user.uid]
            : [user.uid, ...people.map((person) => person.id)]
        )
      );
      const nextUnreadCounts = { ...(selectedRoom?.unreadCounts || {}) };

      recipientIds.forEach((recipientId) => {
        nextUnreadCounts[recipientId] =
          recipientId === user.uid
            ? 0
            : (nextUnreadCounts[recipientId] || 0) + 1;
      });

      await updateDoc(doc(db, 'rooms', selectedRoomId), {
        lastMessageText:
          trimmedText || (attachmentName ? `Sent ${attachmentName}` : ''),
        lastMessageSenderId: user.uid,
        unreadCounts: nextUnreadCounts,
        updatedAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, 'rooms', selectedRoomId, 'typing', user.uid),
        {
          displayName: user.displayName || user.email || 'Denuel User',
          isTyping: false,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessageText('');
      setSelectedFile(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Message send failed'
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendMessage = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    await sendMessage();
  };

  const handleComposerKeyDown = async (
    event: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await sendMessage();
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

        <div className='sidebar-summary'>
          <div className='summary-card'>
            <strong>{channelRooms.length}</strong>
            <span>Channels</span>
          </div>
          <div className='summary-card'>
            <strong>{onlineTeammates}</strong>
            <span>Online</span>
          </div>
          <div className='summary-card'>
            <strong>{directRooms.length}</strong>
            <span>DMs</span>
          </div>
        </div>

        <form className='form' onSubmit={handleCreateRoom}>
          <input
            className='input'
            type='text'
            placeholder='New channel name'
            value={roomName}
            onChange={(event) => setRoomName(event.target.value)}
            required
          />
          <button className='button' type='submit' disabled={isCreatingRoom}>
            {isCreatingRoom ? 'Creating...' : 'Create channel'}
          </button>
        </form>

        <div className='sidebar-section'>
          <div className='room-section-title'>Search workspace</div>
          <input
            className='input'
            type='text'
            placeholder='Search rooms or people'
            value={roomSearch}
            onChange={(event) => setRoomSearch(event.target.value)}
          />
        </div>

        <div className='sidebar-section'>
          <div className='room-section-title'>Channels</div>
          <div className='room-list'>
            {channelRooms.length > 0 ? (
              channelRooms.map((room) => {
                const unreadCount = getUnreadCount(room);

                return (
                  <button
                    key={room.id}
                    className={`room-card ${room.id === selectedRoomId ? 'room-card-active' : ''}`}
                    onClick={() => setSelectedRoomId(room.id)}
                    type='button'
                  >
                    <div className='room-card-head'>
                      <strong># {room.name}</strong>
                      {unreadCount > 0 ? (
                        <span className='unread-badge'>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <span>{room.lastMessageText || 'No messages yet'}</span>
                  </button>
                );
              })
            ) : (
              <div className='mini-empty-state'>No channels match this search.</div>
            )}
          </div>
        </div>

        <div className='sidebar-section'>
          <div className='room-section-title'>Direct messages</div>
          <div className='room-list'>
            {directRooms.length > 0 ? (
              directRooms.map((room) => {
                const unreadCount = getUnreadCount(room);

                return (
                  <button
                    key={room.id}
                    className={`room-card ${room.id === selectedRoomId ? 'room-card-active' : ''}`}
                    onClick={() => setSelectedRoomId(room.id)}
                    type='button'
                  >
                    <div className='room-card-head'>
                      <strong>{getRoomLabel(room)}</strong>
                      {unreadCount > 0 ? (
                        <span className='unread-badge'>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <span>{room.lastMessageText || 'No messages yet'}</span>
                  </button>
                );
              })
            ) : (
              <div className='mini-empty-state'>No direct messages yet.</div>
            )}
          </div>
        </div>

        <div className='sidebar-section'>
          <div className='room-section-title'>People</div>
          <div className='presence-list'>
            {filteredTeammates.length > 0 ? (
              filteredTeammates.map((person) => (
                <button
                  key={person.id}
                  className='user-card'
                  onClick={() => void handleOpenDirectMessage(person)}
                  type='button'
                >
                  <span className='user-card-main'>
                    <span className='avatar-badge'>{getInitials(person.displayName)}</span>
                    <span className='user-meta'>
                      <strong>{person.displayName}</strong>
                      <span>{person.email}</span>
                    </span>
                  </span>
                  <span
                    className={`presence-pill presence-${
                      person.presenceStatus || 'offline'
                    }`}
                  >
                    {person.presenceStatus || 'offline'}
                  </span>
                </button>
              ))
            ) : (
              <div className='mini-empty-state'>No teammates match this search.</div>
            )}
          </div>
        </div>
      </aside>

      <section className='card panel chat-main'>
        <div className='chat-main-head'>
          <div>
            <div className='eyebrow'>
              {selectedRoom?.kind === 'direct' ? 'Direct message' : 'Realtime chat'}
            </div>
            <h2 style={{ margin: '12px 0 4px', fontFamily: 'var(--font-heading)' }}>
              {selectedRoom
                ? selectedRoom.kind === 'channel'
                  ? `# ${selectedRoom.name}`
                  : getRoomLabel(selectedRoom)
                : 'Pick a room'}
            </h2>
          </div>
          {selectedRoom ? (
            <div className='chat-header-meta'>
              <div className='summary-card summary-card-compact'>
                <strong>
                  {selectedRoom.kind === 'direct'
                    ? selectedDirectUser?.presenceStatus || 'offline'
                    : `${selectedRoom.memberIds?.length || 1} members`}
                </strong>
                <span>
                  {selectedRoom.kind === 'direct'
                    ? selectedDirectUser?.email || 'Direct chat'
                    : 'Workspace room'}
                </span>
              </div>
              <div className='summary-card summary-card-compact'>
                <strong>{formatDayLabel(selectedRoom.updatedAt)}</strong>
                <span>Latest activity</span>
              </div>
            </div>
          ) : null}
        </div>

        {!selectedRoom ? (
          <div className='hero-callout'>
            <strong>Choose a space to begin</strong>
            <span>
              Create a channel for your team, or start a direct message from
              the people list.
            </span>
          </div>
        ) : null}

        <div className='message-list' ref={messageListRef}>
          {messages.length > 0 ? (
            messages.map((message, index) => {
              const previousMessage = messages[index - 1];
              const showDayLabel =
                !previousMessage ||
                formatDayLabel(previousMessage.createdAt) !==
                  formatDayLabel(message.createdAt);
              const reactionEntries = Object.entries(message.reactions || {}).filter(
                ([, members]) => Object.keys(members).length > 0
              );

              return (
                <div key={message.id} className='message-stack'>
                  {showDayLabel ? (
                    <div className='message-day-separator'>
                      <span>{formatDayLabel(message.createdAt)}</span>
                    </div>
                  ) : null}
                  <article
                    className={`message-card ${
                      message.senderId === user.uid ? 'message-card-own' : ''
                    }`}
                  >
                    <div className='message-frame'>
                      <span className='avatar-badge avatar-badge-small'>
                        {getInitials(message.senderName)}
                      </span>
                      <div className='message-content'>
                        <div className='message-meta'>
                          <strong>{message.senderName}</strong>
                          <span>{formatTimestamp(message.createdAt)}</span>
                        </div>
                        {message.text ? (
                          <div className='message-body'>{message.text}</div>
                        ) : null}
                        {message.attachmentUrl ? (
                          <a
                            className='attachment-link'
                            href={message.attachmentUrl}
                            rel='noreferrer'
                            target='_blank'
                          >
                            {message.attachmentType?.startsWith('image/') ? (
                              <img
                                alt={message.attachmentName || 'Attachment'}
                                className='attachment-preview'
                                src={message.attachmentUrl}
                              />
                            ) : null}
                            <span>
                              {message.attachmentName || 'Attachment'}
                              {message.attachmentSize
                                ? ` (${formatFileSize(message.attachmentSize)})`
                                : ''}
                            </span>
                          </a>
                        ) : null}
                        <div className='message-reactions'>
                          {reactionEntries.map(([emoji, members]) => {
                            const userHasReacted = Boolean(members[user.uid]);

                            return (
                              <button
                                key={emoji}
                                className={`reaction-chip ${
                                  userHasReacted ? 'reaction-chip-active' : ''
                                }`}
                                onClick={() => void handleToggleReaction(message.id, emoji)}
                                type='button'
                              >
                                <span>{emoji}</span>
                                <span>{Object.keys(members).length}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className='reaction-picker'>
                          {REACTION_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              className='reaction-picker-button'
                              onClick={() => void handleToggleReaction(message.id, emoji)}
                              type='button'
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              );
            })
          ) : (
            <div className='empty-state'>
              {selectedRoomId ? (
                <div className='empty-state-copy'>
                  <strong>No messages yet</strong>
                  <span>Start with a greeting, a question, or a file upload.</span>
                </div>
              ) : (
                'Create a channel or open a direct message to start chatting.'
              )}
            </div>
          )}
        </div>

        {activeTypingUsers.length > 0 ? (
          <div className='typing-indicator'>
            <span className='typing-dots'>
              <span />
              <span />
              <span />
            </span>
            <span>
              {activeTypingUsers.map((typingState) => typingState.displayName).join(', ')}
              {' '}
              {activeTypingUsers.length > 1 ? 'are' : 'is'} typing...
            </span>
          </div>
        ) : null}

        <form className='chat-compose-wrap' onSubmit={handleSendMessage}>
          <div className='chat-compose'>
            <textarea
              className='input composer-textarea'
              placeholder='Write a message. Press Enter to send, Shift+Enter for a new line.'
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              disabled={!selectedRoomId}
              rows={3}
            />
            <div className='compose-actions'>
              <label className='button secondary slim file-button'>
                Attach
                <input
                  className='file-input'
                  disabled={!selectedRoomId}
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] || null)
                  }
                  type='file'
                />
              </label>
              <button
                className='button slim'
                type='submit'
                disabled={!selectedRoomId || isSendingMessage}
              >
                {isSendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>

          {selectedFile ? (
            <div className='file-chip'>
              <span>
                Ready to send: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </span>
              <button
                className='button secondary slim'
                onClick={() => setSelectedFile(null)}
                type='button'
              >
                Remove
              </button>
            </div>
          ) : null}
        </form>

        {seenByNames.length > 0 ? (
          <div className='read-receipts'>Seen by {seenByNames.join(', ')}</div>
        ) : null}

        {error ? <div className='auth-error'>{error}</div> : null}
      </section>
    </div>
  );
}
