export type PresenceStatus = 'online' | 'away' | 'offline';

export type Room = {
  id: string;
  kind: 'channel' | 'direct';
  name: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  createdBy: string;
  createdByName: string;
  lastMessageText?: string;
  memberIds?: string[];
  memberNames?: string[];
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
  createdAt?: { seconds: number; nanoseconds: number } | null;
};

export type ChatUser = {
  id: string;
  displayName: string;
  email: string;
  presenceStatus?: PresenceStatus;
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
