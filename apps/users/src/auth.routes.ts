import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthError, type AuthService } from './auth.service.js';

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const registerSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(8),
});

export function registerAuthRoutes(app: FastifyInstance, auth: AuthService): void {
  app.post('/api/auth/register', async (request, reply) => {
    const body = parseBody(registerSchema, request.body, reply);
    if (!body) return;
    return sendSession(reply, await auth.register(body));
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = parseBody(credentialsSchema, request.body, reply);
    if (!body) return;
    return sendSession(reply, await auth.login(body.email, body.password));
  });

  app.get('/api/auth/session', async (request, reply) => {
    const token = bearerToken(request);
    if (!token) return reply.status(401).send({ error: 'Access token missing', errorCode: 'ACCESS_TOKEN_MISSING' });
    return { success: true as const, user: await auth.sessionFromAccessToken(token) };
  });

  app.post('/api/auth/logout', async () => ({ success: true as const }));
}

function sendSession(reply: FastifyReply, session: { accessToken: string; user: unknown }) {
  return reply.send({ success: true, accessToken: session.accessToken, user: session.user });
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown, reply: FastifyReply): T | undefined {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  void reply.status(400).send({ error: validationMessage(parsed.error), errorCode: 'VALIDATION_ERROR' });
  return undefined;
}

function validationMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = issue?.path[0];
  if (field === 'email') return 'Enter a valid email';
  if (field === 'displayName') return 'Display name is required';
  if (field === 'password') {
    return issue && 'minimum' in issue && issue.minimum === 1
      ? 'Password is required'
      : 'Password must be at least 8 characters';
  }
  return 'Invalid request';
}

function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : undefined;
}

export async function sendAuthError(error: unknown, reply: FastifyReply): Promise<boolean> {
  if (!(error instanceof AuthError)) return false;
  await reply.status(error.statusCode).send({ error: error.message, errorCode: error.code });
  return true;
}
