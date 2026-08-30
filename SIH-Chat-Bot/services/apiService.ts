import type { ChatSession, Message } from '../types';
import { getCsrfToken } from './authService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Fetches chat sessions for a user from the backend API.
 * Uses localStorage as a local fallback when offline or for guest mode.
 */
export const getChatsForUser = async (userId: string): Promise<ChatSession[]> => {
  if (userId === 'guest') {
    const saved = localStorage.getItem(`chats_${userId}`);
    return saved ? JSON.parse(saved) : [];
  }

  try {
    const response = await fetch(`${API_BASE}/api/chats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Backend chats fetch failed');
    }

    const chats: Array<{ _id: string; title: string; createdAt: string }> = await response.json();

    const fullSessions: ChatSession[] = await Promise.all(
      chats.map(async (chat) => {
        try {
          const msgResp = await fetch(`${API_BASE}/api/messages/${chat._id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          const rawMsgs: Array<{ role: 'user' | 'model'; text: string; timestamp: number }> = msgResp.ok
            ? await msgResp.json()
            : [];
          const messages: Message[] = rawMsgs.map(m => ({
            role: m.role,
            text: m.text,
            timestamp: m.timestamp,
          }));

          return {
            id: chat._id,
            title: chat.title,
            messages,
            createdAt: new Date(chat.createdAt).getTime(),
          };
        } catch {
          return {
            id: chat._id,
            title: chat.title,
            messages: [],
            createdAt: new Date(chat.createdAt).getTime(),
          };
        }
      })
    );

    return fullSessions;
  } catch (error) {
    console.warn('Using local chat fallback:', error);
    const savedChats = localStorage.getItem(`chats_${userId}`);
    return savedChats ? JSON.parse(savedChats) : [];
  }
};

/**
 * Creates a new chat session on the backend.
 */
export const createBackendChat = async (title: string): Promise<string | null> => {
  const token = getCsrfToken();
  try {
    const response = await fetch(`${API_BASE}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-CSRF-Token': token } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ title }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data._id || null;
  } catch {
    return null;
  }
};

/**
 * Deletes a chat session on the backend.
 */
export const deleteBackendChat = async (chatId: string): Promise<boolean> => {
  const token = getCsrfToken();
  try {
    const response = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(chatId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-CSRF-Token': token } : {}),
      },
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Saves chat sessions locally or synchronizes state.
 */
export const saveChatsForUser = async (userId: string, chats: ChatSession[]): Promise<void> => {
  try {
    if (chats.length > 0) {
      localStorage.setItem(`chats_${userId}`, JSON.stringify(chats));
    } else {
      localStorage.removeItem(`chats_${userId}`);
    }
  } catch (error) {
    console.warn('Could not save chats to local storage:', error);
  }
};
