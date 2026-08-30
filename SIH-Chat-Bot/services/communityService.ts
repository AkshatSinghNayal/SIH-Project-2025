import type { CommunityPost } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'hellomind:community:session';
let sessionPromise: Promise<string> | null = null;

const createSession = async (): Promise<string> => {
  const response = await fetch(`${API_BASE}/api/community/session`, { method: 'POST' });
  if (!response.ok) throw new Error('Could not enter the community right now.');
  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  return data.token as string;
};

const sessionToken = async (renew = false): Promise<string> => {
  if (!renew) {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  if (!sessionPromise) sessionPromise = createSession().finally(() => { sessionPromise = null; });
  return sessionPromise;
};

const request = async <T,>(path: string, init: RequestInit = {}, retry = true): Promise<T> => {
  const token = await sessionToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (response.status === 401 && retry) {
    await sessionToken(true);
    return request<T>(path, init, false);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The community could not update right now.');
  return data as T;
};

export const listCommunityPosts = (before?: number) =>
  request<{ posts: CommunityPost[]; nextCursor: number | null }>(
    `/api/community/posts?limit=15${before ? `&before=${before}` : ''}`,
  );

export const createCommunityPost = (text: string) =>
  request<{ post: CommunityPost }>('/api/community/posts', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

export const toggleCommunitySupport = (postId: string) =>
  request<{ supported: boolean; supports: number }>(`/api/community/posts/${encodeURIComponent(postId)}/support`, {
    method: 'POST',
  });

export const reportCommunityPost = (postId: string, reason: string) =>
  request<{ ok: true }>(`/api/community/posts/${encodeURIComponent(postId)}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const deleteCommunityPost = (postId: string) =>
  request<{ ok: true }>(`/api/community/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
