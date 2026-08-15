import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from '@ligat-fantasy/config';
import type { Db, MongoClient } from 'mongodb';
import { DomainError } from '@ligat-fantasy/domain';
import { registerDashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { registerGameweekRoutes } from './modules/gameweeks/gameweek.routes.js';
import { registerLiveRoutes } from './modules/live/live.routes.js';
import { LiveEventBus } from './modules/live/live-event-bus.js';
import { registerPlayerRoutes } from './modules/players/player.routes.js';
import { registerTeamRoutes } from './modules/teams/team.routes.js';

export interface AppContext { db: Db; client: MongoClient; config: AppConfig; liveEvents: LiveEventBus }

export async function buildApp(context: AppContext): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: context.config.WEB_ORIGIN });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(422).send({ code: error.code, message: error.message });
    }
    app.log.error(error);
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Unexpected server error' });
  });
  app.get('/health', async () => ({ status: 'ok' }));
  await registerPlayerRoutes(app, context);
  await registerGameweekRoutes(app, context);
  await registerTeamRoutes(app, context);
  await registerDashboardRoutes(app, context);
  await registerLiveRoutes(app, context);
  return app;
}
