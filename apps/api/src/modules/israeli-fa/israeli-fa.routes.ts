import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../../app.js';

const objectId = z.string().refine((value) => /^[a-fA-F0-9]{24}$/.test(value), 'Invalid id');
const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true');
const playerQuerySchema = z.object({
  teamId: objectId.optional(),
  position: z.enum(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'ATTACKER']).optional(),
  search: z.string().min(1).optional(),
  active: booleanQuery.optional(),
  includeInactive: booleanQuery.optional(),
});

export async function registerIsraeliFaRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  const israeliFa = context.israeliFa;

  app.get('/teams', async () => israeliFa.listTeams());

  app.get('/teams/:teamId/players', async (request, reply) => {
    const { teamId } = z.object({ teamId: objectId }).parse(request.params);
    const query = z.object({ includeInactive: booleanQuery.optional() }).parse(request.query);
    const team = await israeliFa.getTeam(teamId);
    if (!team) return reply.status(404).send({ code: 'TEAM_NOT_FOUND', message: 'Team not found' });
    return israeliFa.listPlayers({ teamId, includeInactive: query.includeInactive });
  });

  app.get('/players', async (request) => israeliFa.listPlayers(playerQuerySchema.parse(request.query)));
}
