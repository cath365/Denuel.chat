export type Room = {
  id: string;
  name: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  createdBy: string;
  createdByName: string;
  lastMessageText?: string;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
};

export type Message = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
};
