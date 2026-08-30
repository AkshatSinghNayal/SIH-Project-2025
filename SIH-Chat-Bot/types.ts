export interface User {
  id: string;
  username: string;
  password?: string; // Only used for mock auth, should never be sent to frontend in a real app
  isGuest?: boolean;
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

// App views
export type ViewName =
  | 'home'
  | 'chat'
  | 'peer'
  | 'assessment'
  | 'personality'
  | 'tasks'
  | 'community'
  | 'profile'
  | 'settings'
  | 'resources';

// Mood check-in
export interface MoodEntry {
  level: number; // 1 (heavy) .. 5 (steady)
  date: string; // yyyy-mm-dd, one check-in per day (latest wins)
  ts: number;
}

// Assessments
export interface AssessmentResult {
  ts: number;
  score: number;
  maxScore: number;
  skipped: number;
  band: string; // band title
}

export type TraitScores = Record<string, number>; // trait id -> 0..100

export interface PersonalityResult {
  ts: number;
  traits: TraitScores;
  facets?: TraitScores;
  responseConfidence?: number;
  version?: number;
}

export interface DailyFocusPlan {
  date: string;
  task: string;
  nextStep: string;
  done: boolean;
}

export interface TaskReflection {
  date: string;
  rating: 'helped' | 'same' | 'hard';
}

// Community
export interface CommunityPost {
  id: string;
  text: string;
  author: string; // display name ('Anonymous' or a username)
  anonymous: boolean;
  userId?: string;
  ts: number;
  supports: number;
  supported?: boolean;
  isOwn?: boolean;
}

// Anonymous peer chat
export interface PeerProfile {
  nickname: string;
  colorFrom: string;
  colorTo: string;
  seenGuidelines: boolean;
}

export interface PeerMessage {
  id: string;
  from: 'me' | 'peer';
  text: string;
  ts: number;
  reported?: boolean;
}

// Settings
export interface AppSettings {
  notificationTone: 'gentle' | 'none';
  shareWithCounselor: boolean;
}
