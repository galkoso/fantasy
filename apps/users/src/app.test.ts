import type { FastifyInstance } from 'fastify';
import { loadConfig } from '@ligat-fantasy/config';
import { afterEach, describe, expect, it } from 'vitest';
import { AccessTokenService } from './access-token.service.js';
import { buildUsersApp } from './app.js';
import { AuthService } from './auth.service.js';
import { MemoryUsersStore } from './memory-users.store.js';

describe('users auth', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => { if (app) await app.close(); });

  it('registers a user and returns an access token without the password hash', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { displayName: 'Gal', email: 'Gal@Example.com', password: 'secret123' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.user).toEqual({
      id: expect.any(String), email: 'gal@example.com', displayName: 'Gal', isAdmin: false,
    });
    expect(body.user).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('password');
  });

  it('keeps the user signed in through the access token on a later session check', async () => {
    app = await buildTestApp();
    const registered = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { displayName: 'Gal', email: 'gal@example.com', password: 'secret123' },
    });
    const { accessToken, user } = registered.json();
    const session = await app.inject({
      method: 'GET', url: '/api/auth/session', headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toEqual({ success: true, user });
  });

  it('logs in an existing user with email and password', async () => {
    app = await buildTestApp();
    await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { displayName: 'Gal', email: 'gal@example.com', password: 'secret123' },
    });
    const response = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'GAL@example.com', password: 'secret123' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().success).toBe(true);
    expect(response.json().user.email).toBe('gal@example.com');
    expect(response.json().accessToken).toEqual(expect.any(String));
  });

  it('rejects the wrong password without saying whether the email exists', async () => {
    app = await buildTestApp();
    await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { displayName: 'Gal', email: 'gal@example.com', password: 'secret123' },
    });
    const response = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'gal@example.com', password: 'wrong-password' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' });
  });

  it('rejects a second registration with the same email', async () => {
    app = await buildTestApp();
    const payload = { displayName: 'Gal', email: 'gal@example.com', password: 'secret123' };
    await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload });
    expect(response.statusCode).toBe(409);
    expect(response.json().errorCode).toBe('EMAIL_TAKEN');
  });

  it('rejects a missing access token on session', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/auth/session' });
    expect(response.statusCode).toBe(401);
    expect(response.json().errorCode).toBe('ACCESS_TOKEN_MISSING');
  });

  it('rejects a password shorter than 8 characters', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { displayName: 'Gal', email: 'gal@example.com', password: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'Password must be at least 8 characters', errorCode: 'VALIDATION_ERROR',
    });
  });

  it('rejects a missing display name on sign up', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST', url: '/api/auth/register',
      payload: { email: 'gal@example.com', password: 'secret123' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: 'Display name is required', errorCode: 'VALIDATION_ERROR',
    });
  });
});

async function buildTestApp(): Promise<FastifyInstance> {
  const config = loadConfig({ ADMIN_USER_IDS: 'local-demo-user', JWT_ACCESS_SECRET: 'test-jwt-access-secret' });
  return buildUsersApp({
    config,
    auth: new AuthService(
      new MemoryUsersStore(),
      new AccessTokenService(config.JWT_ACCESS_SECRET, 3_600),
      { adminUserIds: config.ADMIN_USER_IDS, bcryptRounds: 4 },
    ),
  });
}
