import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from '@ligat-fantasy/config';
import { ZodError } from 'zod';
import { registerAuthRoutes, sendAuthError } from './auth.routes.js';
import type { AuthService } from './auth.service.js';

export interface UsersAppContext {
  config: AppConfig;
  auth: AuthService;
}

export async function buildUsersApp(context: UsersAppContext): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: context.config.WEB_ORIGIN,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setErrorHandler(async (error, _request, reply) => {
    if (await sendAuthError(error, reply)) return;
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: 'Invalid request', errorCode: 'VALIDATION_ERROR' });
    }
    app.log.error(error);
    return reply.status(500).send({ error: 'Unexpected server error', errorCode: 'INTERNAL_ERROR' });
  });
  app.get('/health', async () => ({ status: 'ok' }));
  registerAuthRoutes(app, context.auth);
  return app;
}
