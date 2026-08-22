import { USERS_BASE } from './api-base';

export function authRegisterUrl(): string {
  return `${USERS_BASE}/api/auth/register`;
}

export function authLoginUrl(): string {
  return `${USERS_BASE}/api/auth/login`;
}

export function authSessionUrl(): string {
  return `${USERS_BASE}/api/auth/session`;
}

export function authLogoutUrl(): string {
  return `${USERS_BASE}/api/auth/logout`;
}
