
export interface User {
  id: string;
  username: string;
  password?: string; // Only used for mock auth, should never be sent to frontend in a real app
}

export type MessageRole = 'user' | 'model';

export interface Message {
  role: MessageRole;
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}
