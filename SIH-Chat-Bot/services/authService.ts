import type { User } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

let csrfTokenInMemory: string | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfTokenInMemory = token;
};

export const getCsrfToken = (): string | null => {
  return csrfTokenInMemory;
};

interface AuthResponse {
  user: User;
  csrfToken?: string;
  error?: string;
}

export const fetchMeApi = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      setCsrfToken(null);
      return null;
    }

    const data: AuthResponse = await response.json();
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
    return data.user;
  } catch {
    setCsrfToken(null);
    return null;
  }
};

export const loginApi = async (username: string, password: string): Promise<User> => {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  const data: AuthResponse = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Invalid username or password.');
  }

  if (data.csrfToken) {
    setCsrfToken(data.csrfToken);
  }

  return data.user;
};

export const registerApi = async (username: string, password: string): Promise<User> => {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  const data: AuthResponse = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Registration failed. Please check your details.');
  }

  if (data.csrfToken) {
    setCsrfToken(data.csrfToken);
  }

  return data.user;
};

export const logoutApi = async (): Promise<void> => {
  const token = getCsrfToken();
  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-CSRF-Token': token } : {}),
      },
      credentials: 'include',
    });
  } catch {
    // Ignore network error on logout
  } finally {
    setCsrfToken(null);
  }
};
