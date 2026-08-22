import type { AuthUser } from '@ligat-fantasy/contracts';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_TOKEN_STORAGE_KEY, AUTH_USER_STORAGE_KEY, USER_ID_STORAGE_KEY,
  clearAuthSession, getStoredAccessToken, persistAuthSession, readStoredUser,
} from './auth-session';

describe('auth session storage', () => {
  it('keeps the access token in localStorage so closing Chrome does not sign the user out', () => {
    const storage = memoryStorage();
    const user: AuthUser = { id: 'abc', email: 'gal@example.com', displayName: 'Gal', isAdmin: false };
    persistAuthSession('jwt-token', user, storage);
    expect(storage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('jwt-token');
    expect(storage.getItem(USER_ID_STORAGE_KEY)).toBe('abc');
    expect(readStoredUser(storage)).toEqual(user);
    expect(getStoredAccessToken(storage)).toBe('jwt-token');
    expect(storage.getItem(AUTH_USER_STORAGE_KEY)).toContain('gal@example.com');
  });

  it('clears the stored token and user on logout', () => {
    const storage = memoryStorage();
    persistAuthSession('jwt-token', { id: 'abc', email: 'gal@example.com', displayName: 'Gal', isAdmin: false }, storage);
    clearAuthSession(storage);
    expect(getStoredAccessToken(storage)).toBeNull();
    expect(readStoredUser(storage)).toBeNull();
  });
});

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear() { data.clear(); },
    getItem(key) { return data.get(key) ?? null; },
    key(index) { return [...data.keys()][index] ?? null; },
    removeItem(key) { data.delete(key); },
    setItem(key, value) { data.set(key, value); },
  };
}
