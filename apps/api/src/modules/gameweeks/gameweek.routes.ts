import { collections } from '@ligat-fantasy/database';
import type { GameweekSummary } from '@ligat-fantasy/contracts';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../app.js';

export async function registerGameweekRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  const collection = context.db.collection<GameweekSummary>(collections.gameweeks);
  app.get('/gameweeks', async () => collection.find().sort({ number: 1 }).toArray());
  app.get('/gameweeks/current', async (_request, reply) => {
    const gameweek = await collection.findOne({ status: { $in: ['OPEN', 'LOCKED', 'LIVE', 'FINALIZING'] } });
    return gameweek ?? reply.status(404).send({ code: 'NO_CURRENT_GAMEWEEK' });
  });
}
