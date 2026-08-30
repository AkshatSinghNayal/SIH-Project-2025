import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setCsrfToken, getCsrfToken, fetchMeApi, loginApi, registerApi, logoutApi } from './authService';

describe('Frontend authService', () => {
  beforeEach(() => {
    setCsrfToken(null);
    vi.restoreAllMocks();
  });

  it('should store and retrieve CSRF token in memory', () => {
    expect(getCsrfToken()).toBeNull();
    setCsrfToken('test_csrf_token_123');
    expect(getCsrfToken()).toBe('test_csrf_token_123');
  });

  it('should fetch current session and set CSRF token on success', async () => {
    const mockUser = { id: '123', username: 'testuser' };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser, csrfToken: 'session_csrf_999' }),
    } as Response);

    const user = await fetchMeApi();
    expect(user).toEqual(mockUser);
    expect(getCsrfToken()).toBe('session_csrf_999');
  });

  it('should clear CSRF token when session fetch fails', async () => {
    setCsrfToken('old_token');
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response);

    const user = await fetchMeApi();
    expect(user).toBeNull();
    expect(getCsrfToken()).toBeNull();
  });

  it('should send credentials and throw error on invalid login', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid username or password.' }),
    } as Response);

    await expect(loginApi('wronguser', 'wrongpass')).rejects.toThrow('Invalid username or password.');
  });

  it('should send CSRF header on logout', async () => {
    setCsrfToken('logout_csrf_token');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await logoutApi();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'logout_csrf_token',
        }),
        credentials: 'include',
      })
    );
    expect(getCsrfToken()).toBeNull();
  });
});
