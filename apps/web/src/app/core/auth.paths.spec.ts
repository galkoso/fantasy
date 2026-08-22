import { describe, expect, it } from 'vitest';
import { authLoginUrl, authLogoutUrl, authRegisterUrl, authSessionUrl } from './auth.paths';

describe('auth paths', () => {
  it('points authentication at the users service', () => {
    expect(authRegisterUrl()).toBe('http://localhost:3002/api/auth/register');
    expect(authLoginUrl()).toBe('http://localhost:3002/api/auth/login');
    expect(authSessionUrl()).toBe('http://localhost:3002/api/auth/session');
    expect(authLogoutUrl()).toBe('http://localhost:3002/api/auth/logout');
  });
});
