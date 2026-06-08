export type PresenceStatus = 'online' | 'away' | 'offline';

export type Room = {
  id: string;
  kind: 'channel' | 'direct';
  name: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  createdBy: string;
  createdByName: string;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  memberIds?: string[];
  memberNames?: string[];
  topic?: string;
  unreadCounts?: Record<string, number>;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
};

export type Message = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentType?: string;
  attachmentUrl?: string;
  deletedAt?: { seconds: number; nanoseconds: number } | null;
  editedAt?: { seconds: number; nanoseconds: number } | null;
  isDeleted?: boolean;
  isPinned?: boolean;
  pinnedAt?: { seconds: number; nanoseconds: number } | null;
  pinnedById?: string;
  pinnedByName?: string;
  reactions?: Record<string, Record<string, string>>;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export type ChatUser = {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  presenceStatus?: PresenceStatus;
  statusMessage?: string;
  lastSeenAt?: { seconds: number; nanoseconds: number } | null;
};

export type ChatReadState = {
  userId: string;
  displayName: string;
  lastReadAt?: { seconds: number; nanoseconds: number } | null;
  lastReadMessageId?: string;
};

export type ChatTypingState = {
  userId: string;
  displayName: string;
  isTyping: boolean;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
};
