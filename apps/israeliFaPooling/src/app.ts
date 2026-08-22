import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from '@ligat-fantasy/config';
import { ScrapeValidationError } from '@ligat-fantasy/football-data';
import { requireAdmin } from './admin.js';
import type { IsraeliFaPoolingService } from './israeli-fa-pooling.service.js';

export interface PoolingAppContext {
  config: AppConfig;
  pooling: IsraeliFaPoolingService;
}

export async function buildPoolingApp(context: PoolingAppContext): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: context.config.WEB_ORIGIN, allowedHeaders: ['Content-Type', 'x-user-id'] });
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  });
  app.get('/health', async () => ({ status: 'ok' }));
  app.post('/sync-squads', async (request, reply) => {
    await requireAdmin(request, reply, context.config);
    if (reply.sent) return;
    try {
      return await context.pooling.syncSquads();
    } catch (error) {
      if (error instanceof ScrapeValidationError) {
        return reply.status(503).send({ code: 'SCRAPE_FAILED', message: error.message });
      }
      throw error;
    }
  });
  return app;
}
