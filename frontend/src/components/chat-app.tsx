'use client';

import { signOut, updateProfile } from 'firebase/auth';
import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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

import { env } from '../lib/env';
import { auth, db, storage } from '../lib/firebase';
import type {
  ChatInvite,
  ChatNotification,
  ChatReadState,
  ChatTypingState,
  ChatUser,
  Message,
  Room,
} from '../types/chat';
import { BrandLockup } from './brand-lockup';
import { LogoSplash } from './logo-splash';
import { useFirebaseAuth } from './firebase-provider';

const REACTION_OPTIONS = ['👍', '❤️', '😂', '🔥'];
const MANAGEABLE_ROLES = ['admin', 'member'] as const;

type SearchResult = {
  roomId: string;
  roomLabel: string;
  message: Message;
};

type RoomVisibility = 'public' | 'private';
type WorkspacePanel = 'details' | 'pinned' | 'members' | 'invites' | 'profile' | 'admin' | null;

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
  memberRoles:
    data.memberRoles && typeof data.memberRoles === 'object'
      ? Object.fromEntries(
          Object.entries(data.memberRoles as Record<string, unknown>).map(
            ([userId, role]) => [
              userId,
              role === 'owner' || role === 'admin' || role === 'member'
                ? role
                : 'member',
            ]
          )
        )
      : {},
  topic: typeof data.topic === 'string' ? data.topic : '',
  visibility: data.visibility === 'private' ? 'private' : 'public',
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
  deletedAt:
    data.deletedAt && typeof data.deletedAt === 'object'
      ? (data.deletedAt as Message['deletedAt'])
      : null,
  editedAt:
    data.editedAt && typeof data.editedAt === 'object'
      ? (data.editedAt as Message['editedAt'])
      : null,
  isDeleted: Boolean(data.isDeleted),
  isPinned: Boolean(data.isPinned),
  pinnedAt:
    data.pinnedAt && typeof data.pinnedAt === 'object'
      ? (data.pinnedAt as Message['pinnedAt'])
      : null,
  pinnedById: typeof data.pinnedById === 'string' ? data.pinnedById : '',
  pinnedByName: typeof data.pinnedByName === 'string' ? data.pinnedByName : '',
  parentMessageId:
    typeof data.parentMessageId === 'string' ? data.parentMessageId : '',
  parentMessagePreview:
    typeof data.parentMessagePreview === 'string'
      ? data.parentMessagePreview
      : '',
  parentMessageSenderName:
    typeof data.parentMessageSenderName === 'string'
      ? data.parentMessageSenderName
      : '',
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
  accountStatus: data.accountStatus === 'suspended' ? 'suspended' : 'active',
  bio: typeof data.bio === 'string' ? data.bio : '',
  photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
  presenceStatus:
    data.presenceStatus === 'online' ||
    data.presenceStatus === 'away' ||
    data.presenceStatus === 'offline'
      ? data.presenceStatus
      : 'offline',
  statusMessage: typeof data.statusMessage === 'string' ? data.statusMessage : '',
  workspaceRole: data.workspaceRole === 'admin' ? 'admin' : 'member',
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

const asInvite = (id: string, data: Record<string, unknown>): ChatInvite => ({
  id,
  roomId: String(data.roomId || ''),
  roomName: String(data.roomName || 'Denuel Chat room'),
  email: String(data.email || ''),
  role: data.role === 'admin' ? 'admin' : 'member',
  status:
    data.status === 'accepted' || data.status === 'revoked'
      ? data.status
      : 'pending',
  invitedById: String(data.invitedById || ''),
  invitedByName: String(data.invitedByName || 'Teammate'),
  createdAt:
    data.createdAt && typeof data.createdAt === 'object'
      ? (data.createdAt as ChatInvite['createdAt'])
      : null,
  acceptedAt:
    data.acceptedAt && typeof data.acceptedAt === 'object'
      ? (data.acceptedAt as ChatInvite['acceptedAt'])
      : null,
});

const asNotification = (
  id: string,
  data: Record<string, unknown>
): ChatNotification => ({
  id,
  type:
    data.type === 'invite' || data.type === 'reply'
      ? data.type
      : 'announcement',
  recipientId: String(data.recipientId || ''),
  actorId: String(data.actorId || ''),
  actorName: String(data.actorName || 'Teammate'),
  roomId: typeof data.roomId === 'string' ? data.roomId : '',
  roomName: typeof data.roomName === 'string' ? data.roomName : '',
  messageId: typeof data.messageId === 'string' ? data.messageId : '',
  text: String(data.text || ''),
  isRead: Boolean(data.isRead),
  createdAt:
    data.createdAt && typeof data.createdAt === 'object'
      ? (data.createdAt as ChatNotification['createdAt'])
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

const formatRelativeSeen = (
  timestamp?: { seconds: number; nanoseconds: number } | null
) => {
  if (!timestamp) {
    return 'No recent activity';
  }

  const deltaMinutes = Math.max(
    0,
    Math.round((Date.now() - timestampToMs(timestamp)) / 60000)
  );

  if (deltaMinutes < 1) {
    return 'Active just now';
  }

  if (deltaMinutes < 60) {
    return `Active ${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);

  if (deltaHours < 24) {
    return `Active ${deltaHours}h ago`;
  }

  return `Active on ${formatDayLabel(timestamp)}`;
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

const sanitizeFirestoreValue = (value: unknown): unknown => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeFirestoreValue(entry))
      .filter((entry) => entry !== undefined);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value.constructor !== Object) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
      if (!key.trim()) {
        return [];
      }

      const sanitizedEntry = sanitizeFirestoreValue(entry);
      return sanitizedEntry === undefined ? [] : [[key, sanitizedEntry]];
    })
  );
};

const sanitizeFirestoreData = <T extends Record<string, unknown>>(data: T) =>
  sanitizeFirestoreValue(data) as T;

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const createMemberShape = (
  room: Room | null,
  userId: string,
  displayName: string,
  role: 'owner' | 'admin' | 'member'
) => {
  const memberIds = Array.from(
    new Set([...(room?.memberIds || []), userId].filter((memberId) => memberId.trim()))
  );
  const memberNamesMap = Object.fromEntries(
    (room?.memberIds || [])
      .filter((memberId) => memberId.trim())
      .map((memberId, index) => [memberId, room?.memberNames?.[index] || memberId])
  );
  memberNamesMap[userId] = displayName;

  return {
    memberIds,
    memberNames: memberIds.map((memberId) => memberNamesMap[memberId] || memberId),
    memberRoles: {
      ...(room?.memberRoles || {}),
      [userId]: role,
    },
  };
};

const getRoomRoleForUser = (room: Room | null, userId?: string | null) => {
  if (!room || !userId) {
    return '';
  }

  if (room.kind === 'direct') {
    return 'member';
  }

  if (room.memberRoles?.[userId]) {
    return room.memberRoles[userId];
  }

  if (room.createdBy === userId) {
    return 'owner';
  }

  if ((room.memberIds || []).includes(userId)) {
    return 'member';
  }

  return '';
};

const canUserAccessRoom = (room: Room, userId?: string | null) => {
  if (!userId) {
    return false;
  }

  if (room.kind === 'direct') {
    return (room.memberIds || []).includes(userId);
  }

  if (room.visibility !== 'private') {
    return true;
  }

  return getRoomRoleForUser(room, userId) !== '';
};

function AvatarBadge({
  displayName,
  photoURL,
  size = 'md',
}: {
  displayName: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'lg'
      ? 'avatar-badge-large'
      : size === 'sm'
        ? 'avatar-badge-small'
        : '';

  return photoURL ? (
    <span className={`avatar-badge ${sizeClass}`}>
      <img alt={displayName} className='avatar-badge-image' src={photoURL} />
    </span>
  ) : (
    <span className={`avatar-badge ${sizeClass}`}>{getInitials(displayName)}</span>
  );
}

export function ChatApp() {
  const router = useRouter();
  const { user, isLoading } = useFirebaseAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<ChatUser[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [readStates, setReadStates] = useState<ChatReadState[]>([]);
  const [typingStates, setTypingStates] = useState<ChatTypingState[]>([]);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [roomInvites, setRoomInvites] = useState<ChatInvite[]>([]);
  const [myInvites, setMyInvites] = useState<ChatInvite[]>([]);
  const [recentMessages, setRecentMessages] = useState<SearchResult[]>([]);
  const [roomName, setRoomName] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [roomTopicDraft, setRoomTopicDraft] = useState('');
  const [channelNameDraft, setChannelNameDraft] = useState('');
  const [channelVisibilityDraft, setChannelVisibilityDraft] =
    useState<RoomVisibility>('public');
  const [newChannelVisibility, setNewChannelVisibility] =
    useState<RoomVisibility>('public');
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileStatus, setProfileStatus] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [activeThreadMessageId, setActiveThreadMessageId] = useState<string | null>(
    null
  );
  const [pendingNotificationMessageId, setPendingNotificationMessageId] = useState<
    string | null
  >(null);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >('unsupported');
  const [error, setError] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [activeMessageActionId, setActiveMessageActionId] = useState<string | null>(
    null
  );
  const [activeWorkspacePanel, setActiveWorkspacePanel] = useState<WorkspacePanel>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const processingInviteIdsRef = useRef<Set<string>>(new Set());
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setRooms([]);
      return undefined;
    }

    let publicRooms: Room[] = [];
    let memberRooms: Room[] = [];
    let ownedRooms: Room[] = [];

    const syncRooms = () => {
      const merged = [...publicRooms, ...memberRooms, ...ownedRooms];
      const uniqueRooms = Array.from(
        new Map(merged.map((room) => [room.id, room])).values()
      ).sort(
        (left, right) => timestampToMs(right.updatedAt) - timestampToMs(left.updatedAt)
      );

      setRooms(uniqueRooms);
    };

    const publicRoomsQuery = query(
      collection(db, 'rooms'),
      where('kind', '==', 'channel'),
      where('visibility', '==', 'public'),
      limit(80)
    );
    const memberRoomsQuery = query(
      collection(db, 'rooms'),
      where('memberIds', 'array-contains', user.uid),
      limit(80)
    );
    const ownedRoomsQuery = query(
      collection(db, 'rooms'),
      where('createdBy', '==', user.uid),
      limit(80)
    );

    const unsubscribePublic = onSnapshot(
      publicRoomsQuery,
      (snapshot) => {
        publicRooms = snapshot.docs.map((roomDoc) => asRoom(roomDoc.id, roomDoc.data()));
        syncRooms();
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    const unsubscribeMember = onSnapshot(
      memberRoomsQuery,
      (snapshot) => {
        memberRooms = snapshot.docs.map((roomDoc) => asRoom(roomDoc.id, roomDoc.data()));
        syncRooms();
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    const unsubscribeOwned = onSnapshot(
      ownedRoomsQuery,
      (snapshot) => {
        ownedRooms = snapshot.docs.map((roomDoc) => asRoom(roomDoc.id, roomDoc.data()));
        syncRooms();
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return () => {
      unsubscribePublic();
      unsubscribeMember();
      unsubscribeOwned();
    };
  }, [user]);

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), limit(150));

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

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return undefined;
    }

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      limit(80)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        setNotifications(
          snapshot.docs
            .map((notificationDoc) =>
              asNotification(notificationDoc.id, notificationDoc.data())
            )
            .sort(
              (left, right) =>
                timestampToMs(right.createdAt) - timestampToMs(left.createdAt)
            )
        );
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user?.email) {
      setMyInvites([]);
      return undefined;
    }

    const invitesQuery = query(
      collection(db, 'invites'),
      where('email', '==', user.email.toLowerCase()),
      limit(80)
    );

    const unsubscribe = onSnapshot(
      invitesQuery,
      (snapshot) => {
        setMyInvites(snapshot.docs.map((inviteDoc) => asInvite(inviteDoc.id, inviteDoc.data())));
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, [user]);

  const visibleRooms = useMemo(() => {
    if (!user) {
      return [];
    }

    return rooms.filter((room) => canUserAccessRoom(room, user.uid));
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
    setActiveWorkspacePanel(null);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      setReadStates([]);
      setTypingStates([]);
      setRoomInvites([]);
      setActiveThreadMessageId(null);
      return undefined;
    }

    const messagesQuery = query(
      collection(db, 'rooms', selectedRoomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(220)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((messageDoc) => asMessage(messageDoc.id, messageDoc.data()))
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
      limit(80)
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
      limit(80)
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
    if (!selectedRoomId) {
      return undefined;
    }

    const invitesQuery = query(
      collection(db, 'invites'),
      where('roomId', '==', selectedRoomId),
      limit(80)
    );

    const unsubscribe = onSnapshot(
      invitesQuery,
      (snapshot) => {
        setRoomInvites(
          snapshot.docs
            .map((inviteDoc) => asInvite(inviteDoc.id, inviteDoc.data()))
            .sort(
              (left, right) =>
                timestampToMs(right.createdAt) - timestampToMs(left.createdAt)
            )
        );
      },
      (caughtError) => {
        setError(caughtError.message);
      }
    );

    return unsubscribe;
  }, [selectedRoomId]);

  useEffect(() => {
    const recentMessagesQuery = query(
      collectionGroup(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(220)
    );

    const unsubscribe = onSnapshot(
      recentMessagesQuery,
      (snapshot) => {
        setRecentMessages(
          snapshot.docs.map((messageDoc) => {
            const roomId = messageDoc.ref.parent.parent?.id || '';
            const room = rooms.find((candidate) => candidate.id === roomId);

            return {
              roomId,
              roomLabel: room ? room.name : 'Conversation',
              message: asMessage(messageDoc.id, messageDoc.data()),
            };
          })
        );
      },
      () => {
        // collection group search is best-effort; chat should still work without it
      }
    );

    return unsubscribe;
  }, [rooms]);

  const selectedRoom = useMemo(
    () => visibleRooms.find((room) => room.id === selectedRoomId) || null,
    [selectedRoomId, visibleRooms]
  );

  useEffect(() => {
    if (!messageListRef.current) {
      return;
    }

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, selectedRoomId, activeThreadMessageId]);

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

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserNotificationPermission('unsupported');
      return;
    }

    setBrowserNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (
      browserNotificationPermission !== 'granted' ||
      typeof document === 'undefined'
    ) {
      notifications.forEach((notification) => {
        seenNotificationIdsRef.current.add(notification.id);
      });
      return;
    }

    notifications.forEach((notification) => {
      if (seenNotificationIdsRef.current.has(notification.id)) {
        return;
      }

      seenNotificationIdsRef.current.add(notification.id);

      if (!notification.isRead && document.hidden) {
        // eslint-disable-next-line no-new
        new Notification(notification.actorName, {
          body: notification.text,
          icon: '/branding/logo-primary.jpg',
        });
      }
    });
  }, [browserNotificationPermission, notifications]);

  const currentUserRecord = useMemo(
    () =>
      people.find((person) => person.id === user?.uid) || {
        id: user?.uid || '',
        displayName: user?.displayName || user?.email || 'Denuel User',
        email: user?.email || '',
        accountStatus: 'active',
        photoURL: user?.photoURL || '',
        bio: '',
        statusMessage: '',
        presenceStatus: 'online',
        workspaceRole:
          user?.email?.toLowerCase() === env.primaryAdminEmail.toLowerCase()
            ? 'admin'
            : 'member',
        lastSeenAt: null,
      },
    [people, user]
  );
  const visibleError = error.toLowerCase().includes('timed out') ? '' : error;

  useEffect(() => {
    if (!user) {
      return;
    }

    setProfileDisplayName(
      currentUserRecord.displayName || user.displayName || user.email || 'Denuel User'
    );
    setProfileStatus(currentUserRecord.statusMessage || '');
    setProfileBio(currentUserRecord.bio || '');
  }, [currentUserRecord, user]);

  useEffect(() => {
    setChannelNameDraft(selectedRoom?.kind === 'channel' ? selectedRoom.name : '');
    setRoomTopicDraft(selectedRoom?.topic || '');
    setChannelVisibilityDraft(selectedRoom?.visibility || 'public');
    setEditingMessageId(null);
    setEditingMessageText('');
    setActiveMessageActionId(null);
    setInviteEmail('');
    setInviteRole('member');
  }, [selectedRoomId, selectedRoom]);

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
    const match = people.find((person) => person.id === targetUserId);

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
        room.topic || '',
        room.visibility || '',
        ...(room.memberNames || []),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(roomSearchValue);
    });
  }, [roomSearchValue, visibleRooms, people, user]);

  const filteredTeammates = useMemo(() => {
    if (!roomSearchValue) {
      return teammates;
    }

    return teammates.filter((person) =>
      `${person.displayName} ${person.email} ${person.statusMessage || ''}`
        .toLowerCase()
        .includes(roomSearchValue)
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

  const visibleRoomIds = useMemo(
    () => new Set(visibleRooms.map((room) => room.id)),
    [visibleRooms]
  );

  const filteredMessageResults = useMemo(() => {
    const searchValue = messageSearch.trim().toLowerCase();

    if (!searchValue) {
      return [];
    }

    return recentMessages
      .filter((result) => visibleRoomIds.has(result.roomId))
      .filter((result) => {
        const haystack = [
          result.roomLabel,
          result.message.text,
          result.message.senderName,
          result.message.parentMessagePreview || '',
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchValue);
      })
      .slice(0, 8);
  }, [messageSearch, recentMessages, visibleRoomIds]);

  const selectedDirectUser = useMemo(() => {
    if (!selectedRoom || selectedRoom.kind !== 'direct' || !user) {
      return null;
    }

    const otherMemberId = (selectedRoom.memberIds || []).find(
      (memberId) => memberId !== user.uid
    );

    return people.find((person) => person.id === otherMemberId) || null;
  }, [selectedRoom, people, user]);

  const currentRole = useMemo(() => {
    if (!selectedRoom || !user) {
      return '';
    }

    return getRoomRoleForUser(selectedRoom, user.uid);
  }, [selectedRoom, user]);

  const canManageRoom = Boolean(
    selectedRoom?.kind === 'channel' &&
      (currentRole === 'owner' || currentRole === 'admin')
  );

  const canInvitePeople = canManageRoom;
  const isWorkspaceAdmin = currentUserRecord.workspaceRole === 'admin';
  const isSelectedRoomMember = Boolean(
    selectedRoom?.kind !== 'channel' ||
      !user ||
      getRoomRoleForUser(selectedRoom, user.uid) !== ''
  );

  const selectedRoomMembers = useMemo(() => {
    if (!selectedRoom) {
      return [];
    }

    return (selectedRoom.memberIds || []).map((memberId, index) => {
      const person = people.find((candidate) => candidate.id === memberId);

      return {
        id: memberId,
        displayName:
          person?.displayName || selectedRoom.memberNames?.[index] || 'Member',
        email: person?.email || '',
        photoURL: person?.photoURL || '',
        presenceStatus: person?.presenceStatus || 'offline',
        role: getRoomRoleForUser(selectedRoom, memberId) || 'member',
      };
    });
  }, [people, selectedRoom]);

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

  const pinnedMessages = useMemo(
    () =>
      [...messages]
        .filter((message) => message.isPinned && !message.isDeleted)
        .sort((left, right) => timestampToMs(right.pinnedAt) - timestampToMs(left.pinnedAt)),
    [messages]
  );

  const rootMessages = useMemo(
    () => messages.filter((message) => !message.parentMessageId),
    [messages]
  );

  const replyMap = useMemo(() => {
    const nextMap: Record<string, Message[]> = {};

    messages.forEach((message) => {
      if (!message.parentMessageId) {
        return;
      }

      nextMap[message.parentMessageId] = nextMap[message.parentMessageId] || [];
      nextMap[message.parentMessageId].push(message);
    });

    return nextMap;
  }, [messages]);

  const activeThreadMessage = useMemo(
    () =>
      rootMessages.find((message) => message.id === activeThreadMessageId) || null,
    [activeThreadMessageId, rootMessages]
  );

  const activeThreadReplies = useMemo(
    () => (activeThreadMessageId ? replyMap[activeThreadMessageId] || [] : []),
    [activeThreadMessageId, replyMap]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const pendingRoomInvites = useMemo(
    () => roomInvites.filter((invite) => invite.status === 'pending'),
    [roomInvites]
  );

  const pendingUserInvites = useMemo(
    () => myInvites.filter((invite) => invite.status === 'pending'),
    [myInvites]
  );

  const createNotification = async ({
    recipientId,
    actorId,
    actorName,
    roomId,
    roomName,
    messageId,
    text,
    type,
  }: {
    recipientId: string;
    actorId: string;
    actorName: string;
    roomId?: string;
    roomName?: string;
    messageId?: string;
    text: string;
    type: 'invite' | 'reply' | 'announcement';
  }) => {
    if (!recipientId || recipientId === actorId) {
      return;
    }

    await addDoc(
      collection(db, 'notifications'),
      sanitizeFirestoreData({
        recipientId,
        actorId,
        actorName,
        roomId: roomId || '',
        roomName: roomName || '',
        messageId: messageId || '',
        text,
        type,
        isRead: false,
        createdAt: serverTimestamp(),
      })
    );
  };

  const acceptInvite = async (invite: ChatInvite) => {
    if (!user) {
      return;
    }

    if (processingInviteIdsRef.current.has(invite.id)) {
      return;
    }

    processingInviteIdsRef.current.add(invite.id);

    try {
      const selfName = user.displayName || user.email || 'Denuel User';

      await runTransaction(db, async (transaction) => {
        const roomReference = doc(db, 'rooms', invite.roomId);
        const inviteReference = doc(db, 'invites', invite.id);
        const roomSnapshot = await transaction.get(roomReference);
        const inviteSnapshot = await transaction.get(inviteReference);

        if (!roomSnapshot.exists() || !inviteSnapshot.exists()) {
          return;
        }

        const roomData = asRoom(
          roomSnapshot.id,
          roomSnapshot.data() as Record<string, unknown>
        );
        const nextMemberShape = createMemberShape(
          roomData,
          user.uid,
          selfName,
          invite.role
        );

        transaction.update(roomReference, {
          ...nextMemberShape,
          unreadCounts: {
            ...(roomData.unreadCounts || {}),
            [user.uid]: 0,
          },
          updatedAt: serverTimestamp(),
        });

        transaction.update(inviteReference, {
          status: 'accepted',
          acceptedAt: serverTimestamp(),
        });
      });

      await createNotification({
        recipientId: invite.invitedById,
        actorId: user.uid,
        actorName: selfName,
        roomId: invite.roomId,
        roomName: invite.roomName,
        text: `${selfName} joined ${invite.roomName} from your invite.`,
        type: 'announcement',
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Invite acceptance failed'
      );
    } finally {
      processingInviteIdsRef.current.delete(invite.id);
    }
  };

  useEffect(() => {
    pendingUserInvites.forEach((invite) => {
      void acceptInvite(invite);
    });
  }, [pendingUserInvites]);

  useEffect(() => {
    if (!pendingNotificationMessageId) {
      return;
    }

    const targetMessage = messages.find(
      (message) => message.id === pendingNotificationMessageId
    );

    if (!targetMessage) {
      return;
    }

    const rootTargetId = targetMessage.parentMessageId || targetMessage.id;
    setActiveThreadMessageId(rootTargetId);

    const timeoutId = window.setTimeout(() => {
      const focusId = targetMessage.parentMessageId || targetMessage.id;
      const messageElement = document.getElementById(`message-${focusId}`);
      messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingNotificationMessageId(null);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [messages, pendingNotificationMessageId]);

  const handleCreateRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !roomName.trim()) {
      return;
    }

    setIsCreatingRoom(true);
    setError('');

    try {
      const selfName = user.displayName || user.email || 'Denuel User';
      const roomReference = await withTimeout(
        addDoc(
          collection(db, 'rooms'),
          sanitizeFirestoreData({
            kind: 'channel',
            name: roomName.trim(),
            topic: '',
            visibility: newChannelVisibility || 'public',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
            createdByName: selfName,
            memberIds: [user.uid],
            memberNames: [selfName],
            lastMessageText: '',
            lastMessageSenderId: '',
          })
        ),
        12000,
        'Channel creation timed out. Please try again.'
      );

      setRoomName('');
      setNewChannelVisibility('public');
      setSelectedRoomId(roomReference.id);
      setIsCreatingRoom(false);

      void updateDoc(
        doc(db, 'rooms', roomReference.id),
        sanitizeFirestoreData({
          memberRoles: { [user.uid]: 'owner' },
          unreadCounts: { [user.uid]: 0 },
          updatedAt: serverTimestamp(),
        })
      ).catch(() => {
        // The room itself is the important part; metadata can backfill on next activity.
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Room creation failed'
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
        sanitizeFirestoreData({
          kind: 'direct',
          name: targetUser.displayName || targetUser.email || 'Direct message',
          topic: '',
          visibility: 'private',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          createdByName: selfName,
          memberIds: [user.uid, targetUser.id],
          memberNames: [selfName, targetUser.displayName || targetUser.email || 'Teammate'],
          memberRoles: { [user.uid]: 'member', [targetUser.id]: 'member' },
          unreadCounts: { [user.uid]: 0, [targetUser.id]: 0 },
          lastMessageText: '',
          lastMessageSenderId: '',
        }),
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

  const handleJoinChannel = async () => {
    if (!user || !selectedRoomId || !selectedRoom || selectedRoom.kind !== 'channel') {
      return;
    }

    if (selectedRoom.visibility === 'private') {
      setError('This private channel requires an invite.');
      return;
    }

    setIsJoiningRoom(true);
    setError('');

    try {
      const selfName = user.displayName || user.email || 'Denuel User';
      const nextMemberShape = createMemberShape(
        selectedRoom,
        user.uid,
        selfName,
        'member'
      );

      await updateDoc(doc(db, 'rooms', selectedRoomId), {
        ...nextMemberShape,
        unreadCounts: {
          ...(selectedRoom.unreadCounts || {}),
          [user.uid]: 0,
        },
        updatedAt: serverTimestamp(),
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Join channel failed');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleUpdateWorkspaceRole = async (
    targetUser: ChatUser,
    role: 'member' | 'admin'
  ) => {
    if (!isWorkspaceAdmin) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        workspaceRole: role,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Workspace role update failed'
      );
    }
  };

  const handleUpdateAccountStatus = async (
    targetUser: ChatUser,
    accountStatus: 'active' | 'suspended'
  ) => {
    if (!isWorkspaceAdmin || targetUser.id === user?.uid) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        accountStatus,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Account moderation failed'
      );
    }
  };

  const handleUpdateMemberRole = async (
    memberId: string,
    role: 'admin' | 'member'
  ) => {
    if (!selectedRoomId || !selectedRoom || selectedRoom.kind !== 'channel') {
      return;
    }

    const targetMember = selectedRoomMembers.find((member) => member.id === memberId);

    if (!targetMember || targetMember.role === 'owner') {
      return;
    }

    setError('');

    try {
      await updateDoc(doc(db, 'rooms', selectedRoomId), {
        memberRoles: {
          ...(selectedRoom.memberRoles || {}),
          [memberId]: role,
        },
        updatedAt: serverTimestamp(),
      });

      await createNotification({
        recipientId: memberId,
        actorId: user?.uid || '',
        actorName: user?.displayName || user?.email || 'Denuel User',
        roomId: selectedRoomId,
        roomName: selectedRoom.name,
        text: `Your role in ${selectedRoom.name} is now ${role}.`,
        type: 'announcement',
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Role update failed');
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !selectedRoomId) {
      return;
    }

    const targetMessage = messages.find((message) => message.id === messageId);

    if (targetMessage?.isDeleted) {
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const messageReference = doc(db, 'rooms', selectedRoomId, 'messages', messageId);
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
          currentReaction[user.uid] = user.displayName || user.email || 'Denuel User';
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
        caughtError instanceof Error ? caughtError.message : 'Reaction update failed'
      );
    }
  };

  const handleTogglePinMessage = async (message: Message) => {
    if (!user || !selectedRoomId) {
      return;
    }

    setActiveMessageActionId(message.id);
    setError('');

    try {
      await updateDoc(doc(db, 'rooms', selectedRoomId, 'messages', message.id), {
        isPinned: !message.isPinned,
        pinnedAt: !message.isPinned ? serverTimestamp() : null,
        pinnedById: !message.isPinned ? user.uid : '',
        pinnedByName:
          !message.isPinned ? user.displayName || user.email || 'Denuel User' : '',
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Pin update failed');
    } finally {
      setActiveMessageActionId(null);
    }
  };

  const handleStartEditingMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingMessageText(message.text);
    setActiveMessageActionId(null);
  };

  const handleCancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const updateRoomPreviewIfNeeded = async (
    messageId: string,
    nextPreview: string
  ) => {
    if (!selectedRoomId || messages[messages.length - 1]?.id !== messageId) {
      return;
    }

    await updateDoc(doc(db, 'rooms', selectedRoomId), {
      lastMessageText: nextPreview,
      updatedAt: serverTimestamp(),
    });
  };

  const handleSaveEditedMessage = async (messageId: string) => {
    if (!selectedRoomId) {
      return;
    }

    const trimmedText = editingMessageText.trim();

    if (!trimmedText) {
      setError('Edited messages cannot be empty.');
      return;
    }

    setActiveMessageActionId(messageId);
    setError('');

    try {
      await updateDoc(doc(db, 'rooms', selectedRoomId, 'messages', messageId), {
        text: trimmedText,
        editedAt: serverTimestamp(),
      });

      await updateRoomPreviewIfNeeded(messageId, trimmedText);

      setEditingMessageId(null);
      setEditingMessageText('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Message edit failed');
    } finally {
      setActiveMessageActionId(null);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedRoomId) {
      return;
    }

    const shouldDelete = window.confirm('Remove this message from the conversation?');

    if (!shouldDelete) {
      return;
    }

    setActiveMessageActionId(messageId);
    setError('');

    try {
      await updateDoc(doc(db, 'rooms', selectedRoomId, 'messages', messageId), {
        text: 'Message removed',
        attachmentName: '',
        attachmentSize: 0,
        attachmentType: '',
        attachmentUrl: '',
        reactions: {},
        isDeleted: true,
        deletedAt: serverTimestamp(),
        editedAt: serverTimestamp(),
      });

      await updateRoomPreviewIfNeeded(messageId, 'Message removed');

      if (editingMessageId === messageId) {
        setEditingMessageId(null);
        setEditingMessageText('');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Message delete failed');
    } finally {
      setActiveMessageActionId(null);
    }
  };

  const handleSaveRoomDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedRoomId || !selectedRoom || selectedRoom.kind !== 'channel') {
      return;
    }

    const nextName = channelNameDraft.trim();

    if (!nextName) {
      setError('Channel name cannot be empty.');
      return;
    }

    setIsSavingRoom(true);
    setError('');

    try {
      await withTimeout(
        updateDoc(doc(db, 'rooms', selectedRoomId), {
          name: nextName,
          topic: roomTopicDraft.trim(),
          visibility: channelVisibilityDraft,
          updatedAt: serverTimestamp(),
        }),
        12000,
        'Saving room details timed out. Please try again.'
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Room update failed');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const nextDisplayName = profileDisplayName.trim() || user.email || 'Denuel User';
    let nextPhotoURL = currentUserRecord.photoURL || user.photoURL || '';

    setIsSavingProfile(true);
    setError('');

    try {
      if (selectedAvatarFile) {
        const avatarPath = `user-avatars/${user.uid}/${Date.now()}-${selectedAvatarFile.name}`;
        const avatarReference = ref(storage, avatarPath);
        const uploadResult = await uploadBytes(avatarReference, selectedAvatarFile);
        nextPhotoURL = await getDownloadURL(uploadResult.ref);
      }

      await updateProfile(user, {
        displayName: nextDisplayName,
        photoURL: nextPhotoURL || null,
      });

      await setDoc(
        doc(db, 'users', user.uid),
        sanitizeFirestoreData({
          email: user.email || '',
          displayName: nextDisplayName,
          photoURL: nextPhotoURL,
          statusMessage: profileStatus.trim(),
          bio: profileBio.trim(),
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );

      setSelectedAvatarFile(null);
      setActiveWorkspacePanel(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Profile update failed');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleInviteByEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !selectedRoomId || !selectedRoom || !inviteEmail.trim()) {
      return;
    }

    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const existingInvite = pendingRoomInvites.find(
      (invite) => invite.email.toLowerCase() === normalizedEmail
    );

    if (existingInvite) {
      setError('There is already a pending invite for that email.');
      return;
    }

    setIsInviting(true);
    setError('');

    try {
      const inviteReference = await withTimeout(
        addDoc(
          collection(db, 'invites'),
          sanitizeFirestoreData({
            roomId: selectedRoomId,
            roomName: selectedRoom.name || 'Untitled room',
            email: normalizedEmail,
            role: inviteRole,
            status: 'pending',
            invitedById: user.uid,
            invitedByName: user.displayName || user.email || 'Denuel User',
            createdAt: serverTimestamp(),
          })
        ),
        12000,
        'Invite creation timed out. Please try again.'
      );

      const inviteUrl = `${env.appUrl}/login?invite=${inviteReference.id}`;
      const existingPerson = people.find(
        (person) => person.email.toLowerCase() === normalizedEmail
      );

      if (existingPerson) {
        try {
          await createNotification({
            recipientId: existingPerson.id,
            actorId: user.uid,
            actorName: user.displayName || user.email || 'Denuel User',
            roomId: selectedRoomId,
            roomName: selectedRoom.name,
            text: `${user.displayName || user.email} invited you to ${selectedRoom.name} as ${inviteRole}.`,
            type: 'invite',
          });
        } catch {
          // Email invite should still complete even if the in-app notification fails.
        }
      }

      try {
        const response = await fetch('/api/invite-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: normalizedEmail,
            inviteUrl,
            inviterName: user.displayName || user.email || 'Denuel User',
            roomName: selectedRoom.name,
            role: inviteRole,
          }),
        });

        const result = (await response.json()) as {
          sent?: boolean;
          mode?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(result.error || 'Invite send failed.');
        }

        if (!result.sent) {
          const mailtoLink = `mailto:${encodeURIComponent(
            normalizedEmail
          )}?subject=${encodeURIComponent(
            `You're invited to ${selectedRoom.name} on Denuel Chat`
          )}&body=${encodeURIComponent(
            `Hello,\n\n${user.displayName || user.email} invited you to join ${selectedRoom.name} on Denuel Chat as ${inviteRole}.\n\nOpen Denuel Chat here: ${inviteUrl}\n\nIf you already have an account, signing in with this email will automatically add you to the room.`
          )}`;

          window.open(mailtoLink, '_blank');
        }
      } catch {
        // The invite document is already created, so fallback gracefully.
      }

      setInviteEmail('');
      setInviteRole('member');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Invite send failed');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setError('');

    try {
      await updateDoc(doc(db, 'invites', inviteId), {
        status: 'revoked',
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Invite revoke failed');
    }
  };

  const handleOpenNotification = async (notification: ChatNotification) => {
    setShowNotificationsPanel(true);

    try {
      await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
    } catch {
      // keep UX moving even if the notification read mark fails
    }

    if (notification.roomId) {
      setSelectedRoomId(notification.roomId);
    }

    if (notification.messageId) {
      setPendingNotificationMessageId(notification.messageId);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unreadItems = notifications.filter((notification) => !notification.isRead);

    for (const notification of unreadItems) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), { isRead: true });
      } catch {
        // keep moving
      }
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserNotificationPermission(permission);
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
      const threadParent = activeThreadMessage;
      const selfName = user.displayName || user.email || 'Denuel User';
      let roomForWrite = selectedRoom;

      if (
        roomForWrite?.kind === 'channel' &&
        !(roomForWrite.memberIds || []).includes(user.uid)
      ) {
        if (roomForWrite.visibility === 'private') {
          throw new Error('This private channel requires an invite before you can post.');
        }

        const nextMemberShape = createMemberShape(roomForWrite, user.uid, selfName, 'member');

        await updateDoc(
          doc(db, 'rooms', selectedRoomId),
          sanitizeFirestoreData({
            ...nextMemberShape,
            unreadCounts: {
              ...(roomForWrite.unreadCounts || {}),
              [user.uid]: 0,
            },
            updatedAt: serverTimestamp(),
          })
        );

        roomForWrite = {
          ...roomForWrite,
          ...nextMemberShape,
          unreadCounts: {
            ...(roomForWrite.unreadCounts || {}),
            [user.uid]: 0,
          },
        };
      }

      const messagePayload: Record<string, unknown> = {
        text: trimmedText,
        senderId: user.uid,
        senderName: selfName,
        createdAt: serverTimestamp(),
      };

      if (attachmentName) {
        messagePayload.attachmentName = attachmentName;
        messagePayload.attachmentSize = attachmentSize;
        messagePayload.attachmentType = attachmentType;
        messagePayload.attachmentUrl = attachmentUrl;
      }

      if (threadParent) {
        messagePayload.parentMessageId = threadParent.id;
        messagePayload.parentMessagePreview =
          threadParent.text || threadParent.attachmentName || '';
        messagePayload.parentMessageSenderName = threadParent.senderName || '';
      }

      const messageReference = await withTimeout(
        addDoc(
          collection(db, 'rooms', selectedRoomId, 'messages'),
          sanitizeFirestoreData(messagePayload)
        ),
        12000,
        'Message send timed out. Please try again.'
      );

      const recipientIds = Array.from(
        new Set(
          roomForWrite?.kind === 'direct'
            ? roomForWrite.memberIds || [user.uid]
            : roomForWrite?.memberIds || [user.uid]
        )
      ).filter((recipientId) => recipientId.trim());
      const nextUnreadCounts = sanitizeFirestoreData({
        ...(roomForWrite?.unreadCounts || {}),
      }) as Record<string, number>;

      recipientIds.forEach((recipientId) => {
        nextUnreadCounts[recipientId] =
          recipientId === user.uid ? 0 : (nextUnreadCounts[recipientId] || 0) + 1;
      });

      try {
        await updateDoc(
          doc(db, 'rooms', selectedRoomId),
          sanitizeFirestoreData({
            lastMessageText:
              trimmedText ||
              (attachmentName
                ? threadParent
                  ? `Reply with ${attachmentName}`
                  : `Sent ${attachmentName}`
                : threadParent
                  ? `Reply: ${threadParent.text || 'thread update'}`
                  : ''),
            lastMessageSenderId: user.uid,
            unreadCounts: nextUnreadCounts,
            updatedAt: serverTimestamp(),
          })
        );
      } catch {
        // Keep the message even if room metadata cannot be refreshed right now.
      }

      try {
        await setDoc(
          doc(db, 'rooms', selectedRoomId, 'typing', user.uid),
          {
            displayName: selfName,
            isTyping: false,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Typing cleanup should never block the actual message send.
      }

      if (threadParent && selectedRoom) {
        const replyRecipients = new Set<string>();

        if (threadParent.senderId && threadParent.senderId !== user.uid) {
          replyRecipients.add(threadParent.senderId);
        }

        (replyMap[threadParent.id] || []).forEach((reply) => {
          if (reply.senderId && reply.senderId !== user.uid) {
            replyRecipients.add(reply.senderId);
          }
        });

        for (const recipientId of Array.from(replyRecipients)) {
          try {
            await createNotification({
              recipientId,
              actorId: user.uid,
              actorName: selfName,
              roomId: selectedRoomId,
              roomName: getRoomLabel(selectedRoom),
              messageId: messageReference.id,
              text: `${selfName} replied in ${getRoomLabel(selectedRoom)}.`,
              type: 'reply',
            });
          } catch {
            // Replies should still send even if notification fan-out fails.
          }
        }
      }

      setMessageText('');
      setSelectedFile(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Message send failed');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
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

  const handleJumpToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleOpenSearchResult = (result: SearchResult) => {
    setSelectedRoomId(result.roomId);
    setPendingNotificationMessageId(result.message.id);
  };

  const toggleWorkspacePanel = (
    panel: Exclude<WorkspacePanel, null>
  ) => {
    setActiveWorkspacePanel((current) => (current === panel ? null : panel));
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isLoading) {
    return <LogoSplash />;
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
          </div>
          <button className='button secondary slim' onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <div className='profile-card'>
          <div className='profile-card-head'>
            <AvatarBadge
              displayName={currentUserRecord.displayName}
              photoURL={currentUserRecord.photoURL}
              size='lg'
            />
            <div className='user-meta'>
              <strong>{currentUserRecord.displayName}</strong>
              <span>{currentUserRecord.email}</span>
              <span className='status-copy'>
                {currentUserRecord.statusMessage || 'Ready to collaborate'}
              </span>
            </div>
          </div>
          <div className='profile-card-actions'>
            <button
              className='button secondary slim'
              onClick={() => toggleWorkspacePanel('profile')}
              type='button'
            >
              {activeWorkspacePanel === 'profile' ? 'Close profile' : 'Edit profile'}
            </button>
            <button
              className='button secondary slim'
              onClick={() => setShowNotificationsPanel((current) => !current)}
              type='button'
            >
              Alerts
              {unreadNotifications > 0 ? (
                <span className='button-badge'>
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              ) : null}
            </button>
            {isWorkspaceAdmin ? (
              <button
                className='button secondary slim'
                onClick={() => toggleWorkspacePanel('admin')}
                type='button'
              >
                {activeWorkspacePanel === 'admin' ? 'Close admin' : 'Admin'}
              </button>
            ) : null}
          </div>
        </div>

        {showNotificationsPanel ? (
          <div className='sidebar-section'>
            <div className='notification-head'>
              <div className='room-section-title'>Notifications</div>
              {unreadNotifications > 0 ? (
                <button
                  className='button secondary slim'
                  onClick={() => void handleMarkAllNotificationsRead()}
                  type='button'
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            {browserNotificationPermission !== 'granted' ? (
              <button
                className='button secondary slim'
                onClick={() => void handleEnableBrowserNotifications()}
                type='button'
              >
                {browserNotificationPermission === 'unsupported'
                  ? 'Browser notifications unsupported'
                  : 'Enable browser alerts'}
              </button>
            ) : null}
            <div className='notification-list'>
              {notifications.length > 0 ? (
                notifications.slice(0, 8).map((notification) => (
                  <button
                    key={notification.id}
                    className={`notification-card ${
                      notification.isRead ? '' : 'notification-card-unread'
                    }`}
                    onClick={() => void handleOpenNotification(notification)}
                    type='button'
                  >
                    <strong>{notification.actorName}</strong>
                    <span>{notification.text}</span>
                    <small>{formatDayLabel(notification.createdAt)}</small>
                  </button>
                ))
              ) : (
                <div className='mini-empty-state'>No alerts right now.</div>
              )}
            </div>
          </div>
        ) : null}

        <div className='sidebar-summary'>
          <div className='summary-card'>
            <strong>{channelRooms.length}</strong>
            <span>Channels</span>
          </div>
          <div className='summary-card'>
            <strong>{onlineTeammates}</strong>
            <span>Online now</span>
          </div>
          <div className='summary-card'>
            <strong>{pinnedMessages.length}</strong>
            <span>Pinned</span>
          </div>
          <div className='summary-card'>
            <strong>{unreadNotifications}</strong>
            <span>Alerts</span>
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
          <select
            className='select'
            value={newChannelVisibility}
            onChange={(event) =>
              setNewChannelVisibility(event.target.value as RoomVisibility)
            }
          >
            <option value='public'>Public channel</option>
            <option value='private'>Private channel</option>
          </select>
          <button className='button' disabled={isCreatingRoom} type='submit'>
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
          <input
            className='input'
            type='text'
            placeholder='Search messages across rooms'
            value={messageSearch}
            onChange={(event) => setMessageSearch(event.target.value)}
          />
          {messageSearch.trim() ? (
            <div className='room-list'>
              {filteredMessageResults.length > 0 ? (
                filteredMessageResults.map((result) => (
                  <button
                    key={`${result.roomId}-${result.message.id}`}
                    className='room-card'
                    onClick={() => handleOpenSearchResult(result)}
                    type='button'
                  >
                    <div className='room-card-head'>
                      <strong>{result.roomLabel}</strong>
                      <span>{formatTimestamp(result.message.createdAt)}</span>
                    </div>
                    <span>
                      {result.message.senderName}: {result.message.text || result.message.attachmentName || 'Attachment'}
                    </span>
                  </button>
                ))
              ) : (
                <div className='mini-empty-state'>No messages match yet.</div>
              )}
            </div>
          ) : null}
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
                      <strong>
                        {room.visibility === 'private' ? 'Lock' : '#'} {room.name}
                      </strong>
                      {unreadCount > 0 ? (
                        <span className='unread-badge'>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <span>{room.topic || room.lastMessageText || 'No messages yet'}</span>
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
                    <AvatarBadge displayName={person.displayName} photoURL={person.photoURL} />
                    <span className='user-meta'>
                      <strong>{person.displayName}</strong>
                      <span>{person.email}</span>
                      <span>{person.statusMessage || formatRelativeSeen(person.lastSeenAt)}</span>
                    </span>
                  </span>
                  <span
                    className={`presence-pill presence-${person.presenceStatus || 'offline'}`}
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
        <div className='chat-main-top'>
          <div>
            <div className='eyebrow'>
              {selectedRoom?.kind === 'direct'
                ? 'Direct message'
                : selectedRoom?.visibility === 'private'
                  ? 'Private channel'
                  : 'Channel'}
            </div>
            <h2 className='chat-room-title'>
              {selectedRoom ? getRoomLabel(selectedRoom) : 'Choose a conversation'}
            </h2>
            <p className='chat-room-subtitle'>
              {selectedRoom
                ? selectedRoom.kind === 'direct'
                  ? selectedDirectUser?.statusMessage ||
                    formatRelativeSeen(selectedDirectUser?.lastSeenAt)
                  : selectedRoom.topic ||
                    (selectedRoom.visibility === 'private'
                      ? 'This room is invite-only and only visible to members.'
                      : 'Add a channel purpose so teammates know what belongs here.')
                : 'Create a channel or open a direct message to get started.'}
            </p>
          </div>
          {selectedRoom ? (
            <div className='chat-header-stats'>
              <div className='summary-card summary-card-compact'>
                <strong>{selectedRoomMembers.length || 1}</strong>
                <span>Participants</span>
              </div>
              <div className='summary-card summary-card-compact'>
                <strong>{pinnedMessages.length}</strong>
                <span>Pinned</span>
              </div>
              <div className='summary-card summary-card-compact'>
                <strong>{activeThreadReplies.length}</strong>
                <span>Thread replies</span>
              </div>
              <div className='summary-card summary-card-compact'>
                <strong>{formatDayLabel(selectedRoom.updatedAt)}</strong>
                <span>Latest activity</span>
              </div>
            </div>
          ) : null}
        </div>

        {selectedRoom && selectedRoom.kind === 'channel' && !isSelectedRoomMember ? (
          <div className='hero-callout hero-callout-inline'>
            <span>
              {selectedRoom.visibility === 'private'
                ? 'This private channel is invite-only.'
                : "You're viewing a public channel. Join it to manage unread counts and member tools."}
            </span>
            {selectedRoom.visibility !== 'private' ? (
              <button
                className='button slim'
                disabled={isJoiningRoom}
                onClick={() => void handleJoinChannel()}
                type='button'
              >
                {isJoiningRoom ? 'Joining...' : 'Join channel'}
              </button>
            ) : null}
          </div>
        ) : null}

        {selectedRoom ? (
          <div className='workspace-toolbar'>
            <button
              className={`button secondary slim workspace-toolbar-button ${
                activeWorkspacePanel === 'details' ? 'workspace-toolbar-button-active' : ''
              }`}
              onClick={() => toggleWorkspacePanel('details')}
              type='button'
            >
              {selectedRoom.kind === 'channel' ? 'Room setup' : 'Contact info'}
            </button>
            <button
              className={`button secondary slim workspace-toolbar-button ${
                activeWorkspacePanel === 'pinned' ? 'workspace-toolbar-button-active' : ''
              }`}
              onClick={() => toggleWorkspacePanel('pinned')}
              type='button'
            >
              Pinned
            </button>
            {selectedRoom.kind === 'channel' ? (
              <button
                className={`button secondary slim workspace-toolbar-button ${
                  activeWorkspacePanel === 'members' ? 'workspace-toolbar-button-active' : ''
                }`}
                onClick={() => toggleWorkspacePanel('members')}
                type='button'
              >
                Members
              </button>
            ) : null}
            {selectedRoom.kind === 'channel' && canInvitePeople ? (
              <button
                className={`button secondary slim workspace-toolbar-button ${
                  activeWorkspacePanel === 'invites' ? 'workspace-toolbar-button-active' : ''
                }`}
                onClick={() => toggleWorkspacePanel('invites')}
                type='button'
              >
                Invites
              </button>
            ) : null}
            <button
              className={`button secondary slim workspace-toolbar-button ${
                activeWorkspacePanel === 'profile' ? 'workspace-toolbar-button-active' : ''
              }`}
              onClick={() => toggleWorkspacePanel('profile')}
              type='button'
            >
              My profile
            </button>
            {isWorkspaceAdmin ? (
              <button
                className={`button secondary slim workspace-toolbar-button ${
                  activeWorkspacePanel === 'admin' ? 'workspace-toolbar-button-active' : ''
                }`}
                onClick={() => toggleWorkspacePanel('admin')}
                type='button'
              >
                Admin
              </button>
            ) : null}
          </div>
        ) : null}

        {selectedRoom &&
        (activeWorkspacePanel || activeThreadMessage) ? (
          <div className='workspace-panel-stack'>
            {activeWorkspacePanel === 'details' ? (
              <div className='detail-card'>
                <div className='detail-card-head'>
                  <strong>Room details</strong>
                  <span>
                    {selectedRoom.kind === 'channel'
                      ? 'Update the channel only when needed. The conversation stays front and center.'
                      : 'Quick context for this private conversation.'}
                  </span>
                </div>

                {selectedRoom.kind === 'channel' ? (
                  <form className='form detail-form' onSubmit={handleSaveRoomDetails}>
                    <input
                      className='input'
                      type='text'
                      placeholder='Channel name'
                      value={channelNameDraft}
                      onChange={(event) => setChannelNameDraft(event.target.value)}
                    />
                    <textarea
                      className='input detail-textarea'
                      placeholder='What is this channel for?'
                      rows={3}
                      value={roomTopicDraft}
                      onChange={(event) => setRoomTopicDraft(event.target.value)}
                    />
                    <select
                      className='select'
                      value={channelVisibilityDraft}
                      onChange={(event) =>
                        setChannelVisibilityDraft(event.target.value as RoomVisibility)
                      }
                    >
                      <option value='public'>Public channel</option>
                      <option value='private'>Private channel</option>
                    </select>
                    <button className='button slim' disabled={isSavingRoom} type='submit'>
                      {isSavingRoom ? 'Saving...' : 'Save channel details'}
                    </button>
                  </form>
                ) : (
                  <div className='detail-stack'>
                    <div className='detail-bullet'>
                      <strong>{selectedDirectUser?.displayName || 'Teammate'}</strong>
                      <span>{selectedDirectUser?.email || 'Private conversation'}</span>
                    </div>
                    <div className='detail-bullet'>
                      <strong>Presence</strong>
                      <span>
                        {selectedDirectUser?.presenceStatus || 'offline'}
                        {' · '}
                        {selectedDirectUser?.statusMessage ||
                          formatRelativeSeen(selectedDirectUser?.lastSeenAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {activeWorkspacePanel === 'pinned' ? (
            <div className='detail-card'>
              <div className='detail-card-head'>
                <strong>Pinned messages</strong>
                <span>Keep the decisions and links your team will need again.</span>
              </div>
              {pinnedMessages.length > 0 ? (
                <div className='detail-stack'>
                  {pinnedMessages.slice(0, 5).map((message) => (
                    <button
                      key={message.id}
                      className='pinned-message-card'
                      onClick={() => handleJumpToMessage(message.id)}
                      type='button'
                    >
                      <strong>{message.senderName}</strong>
                      <span>{message.text || message.attachmentName || 'Pinned attachment'}</span>
                      <small>
                        {message.pinnedByName || 'Pinned'}
                        {' · '}
                        {formatTimestamp(message.pinnedAt)}
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className='mini-empty-state'>
                  Pin an important update so it stays easy to find later.
                </div>
              )}
            </div>
            ) : null}

            {selectedRoom?.kind === 'channel' && activeWorkspacePanel === 'members' ? (
              <div className='detail-card'>
                <div className='detail-card-head'>
                  <strong>Members and roles</strong>
                  <span>Owners and admins can shape who helps run this room.</span>
                </div>
                <div className='member-roster'>
                  {selectedRoomMembers.map((member) => (
                    <div className='member-row' key={member.id}>
                      <span className='user-card-main'>
                        <AvatarBadge displayName={member.displayName} photoURL={member.photoURL} />
                        <span className='user-meta'>
                          <strong>{member.displayName}</strong>
                          <span>{member.email || 'Workspace member'}</span>
                        </span>
                      </span>
                      {canManageRoom && member.role !== 'owner' ? (
                        <select
                          className='select'
                          onChange={(event) =>
                            void handleUpdateMemberRole(
                              member.id,
                              event.target.value as 'admin' | 'member'
                            )
                          }
                          value={member.role}
                        >
                          {MANAGEABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className='role-pill'>{member.role}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedRoom?.kind === 'channel' &&
            canInvitePeople &&
            activeWorkspacePanel === 'invites' ? (
              <div className='detail-card'>
                <div className='detail-card-head'>
                  <strong>Email invites</strong>
                  <span>Send email invites now, with fallback if server email is not configured yet.</span>
                </div>
                <form className='form detail-form invite-form' onSubmit={handleInviteByEmail}>
                  <input
                    className='input'
                    type='email'
                    placeholder='teammate@example.com'
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                  />
                  <select
                    className='select'
                    onChange={(event) =>
                      setInviteRole(event.target.value as 'admin' | 'member')
                    }
                    value={inviteRole}
                  >
                    <option value='member'>Member</option>
                    <option value='admin'>Admin</option>
                  </select>
                  <button className='button slim' disabled={isInviting} type='submit'>
                    {isInviting ? 'Preparing invite...' : 'Invite by email'}
                  </button>
                </form>
                <div className='detail-stack'>
                  {pendingRoomInvites.length > 0 ? (
                    pendingRoomInvites.slice(0, 6).map((invite) => (
                      <div className='invite-card' key={invite.id}>
                        <span>
                          <strong>{invite.email}</strong>
                          <small>{invite.role}</small>
                        </span>
                        <button
                          className='button secondary slim'
                          onClick={() => void handleRevokeInvite(invite.id)}
                          type='button'
                        >
                          Revoke
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className='mini-empty-state'>No pending invites right now.</div>
                  )}
                </div>
              </div>
            ) : null}

            {activeWorkspacePanel === 'profile' ? (
              <div className='detail-card'>
                <div className='detail-card-head'>
                  <strong>Your profile</strong>
                  <span>Update your identity without pushing the conversation off screen.</span>
                </div>
                <form className='form detail-form' onSubmit={handleSaveProfile}>
                  <input
                    className='input'
                    type='text'
                    placeholder='Display name'
                    value={profileDisplayName}
                    onChange={(event) => setProfileDisplayName(event.target.value)}
                  />
                  <input
                    className='input'
                    type='text'
                    placeholder='Status message'
                    value={profileStatus}
                    onChange={(event) => setProfileStatus(event.target.value)}
                  />
                  <textarea
                    className='input detail-textarea'
                    placeholder='Short bio'
                    rows={3}
                    value={profileBio}
                    onChange={(event) => setProfileBio(event.target.value)}
                  />
                  <label className='button secondary slim file-button'>
                    {selectedAvatarFile ? 'Replace avatar' : 'Upload avatar'}
                    <input
                      accept='image/*'
                      className='file-input'
                      onChange={(event) =>
                        setSelectedAvatarFile(event.target.files?.[0] || null)
                      }
                      type='file'
                    />
                  </label>
                  {selectedAvatarFile ? (
                    <div className='file-chip'>
                      <span>
                        Ready to use: {selectedAvatarFile.name} (
                        {formatFileSize(selectedAvatarFile.size)})
                      </span>
                      <button
                        className='button secondary slim'
                        onClick={() => setSelectedAvatarFile(null)}
                        type='button'
                      >
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <button className='button slim' disabled={isSavingProfile} type='submit'>
                    {isSavingProfile ? 'Saving...' : 'Save profile'}
                  </button>
                </form>
              </div>
            ) : null}

            {activeWorkspacePanel === 'admin' ? (
              <div className='detail-card'>
                <div className='detail-card-head'>
                  <strong>Workspace admin</strong>
                  <span>Use admin controls only when you need them, not as the default view.</span>
                </div>
                <div className='member-roster'>
                  {people.map((person) => (
                    <div className='member-row' key={person.id}>
                      <span className='user-card-main'>
                        <AvatarBadge displayName={person.displayName} photoURL={person.photoURL} />
                        <span className='user-meta'>
                          <strong>{person.displayName}</strong>
                          <span>{person.email}</span>
                          <span>
                            {person.workspaceRole || 'member'}
                            {' · '}
                            {person.accountStatus || 'active'}
                          </span>
                        </span>
                      </span>
                      <div className='message-actions'>
                        <select
                          className='select'
                          onChange={(event) =>
                            void handleUpdateWorkspaceRole(
                              person,
                              event.target.value as 'member' | 'admin'
                            )
                          }
                          value={person.workspaceRole || 'member'}
                        >
                          <option value='member'>member</option>
                          <option value='admin'>admin</option>
                        </select>
                        {person.id !== user.uid ? (
                          <button
                            className='button secondary slim'
                            onClick={() =>
                              void handleUpdateAccountStatus(
                                person,
                                person.accountStatus === 'suspended'
                                  ? 'active'
                                  : 'suspended'
                              )
                            }
                            type='button'
                          >
                            {person.accountStatus === 'suspended'
                              ? 'Restore'
                              : 'Suspend'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeThreadMessage ? (
              <div className='detail-card thread-panel'>
                <div className='detail-card-head'>
                  <strong>Thread</strong>
                  <span>Keep a side conversation without losing the main channel flow.</span>
                </div>
                <div className='thread-root-card'>
                  <strong>{activeThreadMessage.senderName}</strong>
                  <span>{activeThreadMessage.text || activeThreadMessage.attachmentName}</span>
                </div>
                <div className='thread-reply-list'>
                  {activeThreadReplies.length > 0 ? (
                    activeThreadReplies.map((reply) => (
                      <div className='thread-reply-card' key={reply.id}>
                        <strong>{reply.senderName}</strong>
                        <span>{reply.text || reply.attachmentName || 'Attachment reply'}</span>
                        <small>{formatTimestamp(reply.createdAt)}</small>
                      </div>
                    ))
                  ) : (
                    <div className='mini-empty-state'>No replies yet. Start the thread.</div>
                  )}
                </div>
                <button
                  className='button secondary slim'
                  onClick={() => setActiveThreadMessageId(null)}
                  type='button'
                >
                  Close thread
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {!selectedRoom ? (
          <div className='hero-callout'>
            <strong>Choose a space to begin</strong>
            <span>
              Create a channel for your team, or start a direct message from the people list.
            </span>
          </div>
        ) : null}

        <div className='message-list' ref={messageListRef}>
          {rootMessages.length > 0 ? (
            rootMessages.map((message, index) => {
              const previousMessage = rootMessages[index - 1];
              const showDayLabel =
                !previousMessage ||
                formatDayLabel(previousMessage.createdAt) !==
                  formatDayLabel(message.createdAt);
              const reactionEntries = Object.entries(message.reactions || {}).filter(
                ([, members]) => Object.keys(members).length > 0
              );
              const isEditing = editingMessageId === message.id;
              const isOwnMessage = message.senderId === user.uid;
              const isBusy = activeMessageActionId === message.id;
              const replyCount = replyMap[message.id]?.length || 0;

              return (
                <div className='message-stack' key={message.id}>
                  {showDayLabel ? (
                    <div className='message-day-separator'>
                      <span>{formatDayLabel(message.createdAt)}</span>
                    </div>
                  ) : null}
                  <article
                    className={`message-card ${isOwnMessage ? 'message-card-own' : ''}`}
                    id={`message-${message.id}`}
                  >
                    <div className='message-frame'>
                      <AvatarBadge
                        displayName={message.senderName}
                        photoURL={
                          people.find((person) => person.id === message.senderId)?.photoURL
                        }
                        size='sm'
                      />
                      <div className='message-content'>
                        <div className='message-meta'>
                          <strong>{message.senderName}</strong>
                          <div className='message-meta-trailing'>
                            <span>{formatTimestamp(message.createdAt)}</span>
                            {message.editedAt ? (
                              <span className='message-flag'>Edited</span>
                            ) : null}
                            {message.isPinned ? (
                              <span className='message-flag'>Pinned</span>
                            ) : null}
                          </div>
                        </div>

                        {isEditing ? (
                          <form
                            className='edit-message-form'
                            onSubmit={(event) => {
                              event.preventDefault();
                              void handleSaveEditedMessage(message.id);
                            }}
                          >
                            <textarea
                              className='input detail-textarea'
                              rows={3}
                              value={editingMessageText}
                              onChange={(event) =>
                                setEditingMessageText(event.target.value)
                              }
                            />
                            <div className='message-actions'>
                              <button className='button slim' disabled={isBusy} type='submit'>
                                {isBusy ? 'Saving...' : 'Save changes'}
                              </button>
                              <button
                                className='button secondary slim'
                                onClick={handleCancelEditingMessage}
                                type='button'
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p
                              className={`message-body ${
                                message.isDeleted ? 'message-body-deleted' : ''
                              }`}
                            >
                              {message.text || (message.isDeleted ? 'Message removed' : '')}
                            </p>

                            {message.attachmentUrl && !message.isDeleted ? (
                              <a
                                className='attachment-card'
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
                                <span className='attachment-copy'>
                                  <strong>{message.attachmentName || 'Attachment'}</strong>
                                  <small>
                                    {message.attachmentSize
                                      ? formatFileSize(message.attachmentSize)
                                      : 'Open attachment'}
                                  </small>
                                </span>
                              </a>
                            ) : null}

                            <div className='message-footer'>
                              {replyCount > 0 ? (
                                <button
                                  className='thread-summary'
                                  onClick={() => setActiveThreadMessageId(message.id)}
                                  type='button'
                                >
                                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'} in thread
                                </button>
                              ) : null}

                              {!message.isDeleted ? (
                                <>
                                  <div className='message-reactions'>
                                    {reactionEntries.map(([emoji, members]) => {
                                      const userHasReacted = Boolean(members[user.uid]);

                                      return (
                                        <button
                                          className={`reaction-chip ${
                                            userHasReacted ? 'reaction-chip-active' : ''
                                          }`}
                                          key={emoji}
                                          onClick={() =>
                                            void handleToggleReaction(message.id, emoji)
                                          }
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
                                        className='reaction-picker-button'
                                        key={emoji}
                                        onClick={() =>
                                          void handleToggleReaction(message.id, emoji)
                                        }
                                        type='button'
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              ) : null}

                              <div className='message-actions'>
                                <button
                                  className='button secondary slim'
                                  onClick={() => setActiveThreadMessageId(message.id)}
                                  type='button'
                                >
                                  {activeThreadMessageId === message.id ? 'Thread open' : 'Reply'}
                                </button>
                                <button
                                  className='button secondary slim'
                                  disabled={isBusy}
                                  onClick={() => void handleTogglePinMessage(message)}
                                  type='button'
                                >
                                  {isBusy
                                    ? 'Saving...'
                                    : message.isPinned
                                      ? 'Unpin'
                                      : 'Pin'}
                                </button>
                                {isOwnMessage && !message.isDeleted ? (
                                  <button
                                    className='button secondary slim'
                                    onClick={() => handleStartEditingMessage(message)}
                                    type='button'
                                  >
                                    Edit
                                  </button>
                                ) : null}
                                {isOwnMessage && !message.isDeleted ? (
                                  <button
                                    className='button secondary slim'
                                    disabled={isBusy}
                                    onClick={() => void handleDeleteMessage(message.id)}
                                    type='button'
                                  >
                                    Delete
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              );
            })
          ) : (
            <div className='hero-callout'>
              <strong>No messages yet</strong>
              <span>Start the conversation with a welcome note, quick update, or file.</span>
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
              {activeTypingUsers.map((typingState) => typingState.displayName).join(', ')}{' '}
              {activeTypingUsers.length > 1 ? 'are' : 'is'} typing...
            </span>
          </div>
        ) : null}

        {activeThreadMessage ? (
          <div className='thread-banner'>
            <strong>Replying in thread</strong>
            <span>
              {activeThreadMessage.senderName}: {activeThreadMessage.text || activeThreadMessage.attachmentName || 'Attachment'}
            </span>
            <button
              className='button secondary slim'
              onClick={() => setActiveThreadMessageId(null)}
              type='button'
            >
              Exit thread
            </button>
          </div>
        ) : null}

        {visibleError ? <div className='auth-error'>{visibleError}</div> : null}

        <form className='chat-compose-wrap' onSubmit={handleSendMessage}>
          <div className='chat-compose'>
            <div className='composer-toolbar'>
              <span className='composer-hint'>
                Enter to send. Shift+Enter for a new line.
              </span>
            </div>
            <textarea
              className='input composer-textarea'
              disabled={!selectedRoomId}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder='Write a message. Press Enter to send, Shift+Enter for a new line.'
              rows={3}
              value={messageText}
            />
            <div className='compose-actions'>
              <div className='compose-actions-start'>
                <label className='button secondary slim file-button'>
                  Attach
                  <input
                    className='file-input'
                    disabled={!selectedRoomId}
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    type='file'
                  />
                </label>
              </div>
              <div className='compose-actions-end'>
                <button
                  className='button slim'
                  disabled={isSendingMessage || !selectedRoomId}
                  type='submit'
                >
                  {isSendingMessage
                    ? 'Sending...'
                    : activeThreadMessage
                      ? 'Send reply'
                      : 'Send message'}
                </button>
              </div>
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

      </section>
    </div>
  );
}
