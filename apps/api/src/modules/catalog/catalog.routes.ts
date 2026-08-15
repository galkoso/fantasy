import { collections } from '@ligat-fantasy/database';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../app.js';

export async function registerCatalogRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  app.get('/clubs', async () => context.db.collection(collections.clubs).find().sort({ name: 1 }).toArray());
  app.get('/fixtures', async (request) => {
    const query = request.query as { gameweekId?: string; status?: string };
    return context.db.collection(collections.fixtures).find({
      ...(query.gameweekId ? { gameweekId: query.gameweekId } : {}),
      ...(query.status ? { status: query.status } : {}),
    }).sort({ kickoffAt: 1 }).toArray();
  });
}
