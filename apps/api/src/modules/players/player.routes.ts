import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../../app.js';
import { PlayerRepository } from './player.repository.js';

const querySchema = z.object({
  search: z.string().optional(),
  position: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']).optional(),
  clubId: z.string().optional(),
  maxPrice: z.coerce.number().int().optional(),
  sort: z.enum(['totalPoints', 'price', 'selectedByPercent', 'form']).optional(),
});

export async function registerPlayerRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  const repository = new PlayerRepository(context.db);
  app.get('/players', async (request) => repository.list(querySchema.parse(request.query)));
  app.get('/players/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const player = (await repository.byIds([id]))[0];
    if (!player) return reply.status(404).send({ code: 'PLAYER_NOT_FOUND' });
    const [points, stats, prices, fixtures] = await Promise.all([
      context.db.collection('player_match_points').find({ playerId: id }).sort({ updatedAt: -1 }).limit(20).toArray(),
      context.db.collection('player_match_stats').find({ playerId: id }).sort({ updatedAt: -1 }).limit(20).toArray(),
      context.db.collection('player_price_history').find({ playerId: id }).sort({ effectiveAt: -1 }).limit(30).toArray(),
      context.db.collection('fixtures').find({ $or: [{ homeClubId: player.clubId }, { awayClubId: player.clubId }] })
        .sort({ kickoffAt: 1 }).limit(10).toArray(),
    ]);
    return { ...player, gameweekHistory: points, matchStats: stats, priceHistory: prices, fixtures };
  });
}
