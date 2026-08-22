import type { AuthUser } from '@ligat-fantasy/contracts';

export const ACCESS_TOKEN_STORAGE_KEY = 'ligat_fantasy_access_token';
export const AUTH_USER_STORAGE_KEY = 'ligat_fantasy_current_user';
export const USER_ID_STORAGE_KEY = 'userId';

export function getStoredAccessToken(storage: Storage = localStorageOrThrow()): string | null {
  try {
    return storage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredUserId(storage: Storage = localStorageOrThrow()): string | null {
  try {
    return storage.getItem(USER_ID_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readStoredUser(storage: Storage = localStorageOrThrow()): AuthUser | null {
  try {
    const raw = storage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    return normalizeAuthUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function persistAuthSession(accessToken: string, user: AuthUser, storage: Storage = localStorageOrThrow()): void {
  storage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  storage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  storage.setItem(USER_ID_STORAGE_KEY, user.id);
}

export function clearAuthSession(storage: Storage = localStorageOrThrow()): void {
  storage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  storage.removeItem(AUTH_USER_STORAGE_KEY);
  storage.removeItem(USER_ID_STORAGE_KEY);
}

export function normalizeAuthUser(value: unknown): AuthUser | null {
  if (typeof value !== 'object' || value === null) return null;
  const user = value as Record<string, unknown>;
  if (typeof user.id !== 'string' || typeof user.email !== 'string' || typeof user.displayName !== 'string') return null;
  return { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin === true };
}

function localStorageOrThrow(): Storage {
  return globalThis.localStorage;
}
