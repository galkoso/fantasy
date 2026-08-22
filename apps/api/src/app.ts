import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from '@ligat-fantasy/config';
import type { SquadSyncResult } from '@ligat-fantasy/contracts';
import type { Db } from 'mongodb';
import { ZodError } from 'zod';
import { registerFootballRoutes } from './modules/football/football.routes.js';
import { registerAdminFootballRoutes } from './modules/admin/admin-football.routes.js';
import { isAdminUser } from './shared/require-admin.js';
import { requestUserId } from './shared/request-user.js';

export interface AppContext {
  db: Db;
  config: AppConfig;
  syncIsraeliPremierLeagueSquads: () => Promise<SquadSyncResult>;
}

export async function buildApp(context: AppContext): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: context.config.WEB_ORIGIN, allowedHeaders: ['Content-Type', 'x-user-id'] });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid request' });
    }
    app.log.error(error);
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/me', async (request) => {
    const id = requestUserId(request);
    return { id, isAdmin: isAdminUser(request, context.config) };
  });
  await app.register(async (instance) => registerFootballRoutes(instance, context), { prefix: '/api/football' });
  await app.register(async (instance) => registerAdminFootballRoutes(instance, context), { prefix: '/api/admin/football' });
  return app;
}
