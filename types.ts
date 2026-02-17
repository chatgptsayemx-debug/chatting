
export interface User {
  id: string;
  username: string;
  password?: string;
  age: string;
  number: string;
  profileImage: string;
  online: boolean;
  lastSeen: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  timestamp: number;
  edited: boolean;
  deleted: boolean;
}

export interface Chat {
  id: string;
  participants: Record<string, boolean>;
  typing: Record<string, boolean>;
  messages?: Record<string, Message>;
}

export type AppScreen = 'SPLASH' | 'AUTH' | 'MAIN';
export type AuthTab = 'LOGIN' | 'SIGNUP';
export type MainTab = 'HOME' | 'PROFILE' | 'CHAT';
