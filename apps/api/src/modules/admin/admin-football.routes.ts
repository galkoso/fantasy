import type { FastifyInstance } from 'fastify';
import { ScrapeValidationError } from '@ligat-fantasy/football-data';
import type { AppContext } from '../../app.js';
import { requireAdmin } from '../../shared/require-admin.js';

export async function registerAdminFootballRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.post('/sync-squads', async (request, reply) => {
    await requireAdmin(request, reply, context.config);
    if (reply.sent) return;
    try {
      return await context.syncIsraeliPremierLeagueSquads();
    } catch (error) {
      if (error instanceof ScrapeValidationError) {
        return reply.status(503).send({ code: 'SCRAPE_FAILED', message: error.message });
      }
      throw error;
    }
  });
}
