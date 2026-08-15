import { randomBytes, randomUUID } from 'node:crypto';
import { collections } from '@ligat-fantasy/database';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../../app.js';
import { requestUserId } from '../../shared/request-user.js';
import { PlayerRepository } from '../players/player.repository.js';
import { TeamRepository } from '../teams/team.repository.js';
import { TeamService } from '../teams/team.service.js';

const createSchema = z.object({ name: z.string().trim().min(3).max(60) });
const joinSchema = z.object({ joinCode: z.string().trim().min(6).max(12) });

export async function registerLeagueRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  const teams = new TeamService(new TeamRepository(context.db), new PlayerRepository(context.db));
  app.post('/leagues', async (request) => {
    const team = await teams.getOrCreate(requestUserId(request));
    const league = { id: randomUUID(), name: createSchema.parse(request.body).name,
      ownerFantasyTeamId: team.id, joinCode: randomBytes(4).toString('hex').toUpperCase(), createdAt: new Date() };
    await context.db.collection(collections.leagues).insertOne(league);
    await context.db.collection(collections.leagueMembers).insertOne({ leagueId: league.id,
      fantasyTeamId: team.id, joinedAt: new Date() });
    return league;
  });
  app.post('/leagues/join', async (request, reply) => {
    const team = await teams.getOrCreate(requestUserId(request));
    const league = await context.db.collection(collections.leagues).findOne(joinSchema.parse(request.body));
    if (!league) return reply.status(404).send({ code: 'LEAGUE_NOT_FOUND' });
    await context.db.collection(collections.leagueMembers).updateOne(
      { leagueId: league.id, fantasyTeamId: team.id }, { $setOnInsert: { joinedAt: new Date() } }, { upsert: true });
    return league;
  });
  app.get('/leagues/:id/table', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const members = await context.db.collection(collections.leagueMembers).find({ leagueId: id }).toArray();
    const ids = members.map((member) => member.fantasyTeamId);
    return context.db.collection(collections.fantasyTeams).find({ id: { $in: ids } })
      .project({ id: 1, name: 1, overallPoints: 1, overallRank: 1 }).sort({ overallPoints: -1 }).toArray();
  });
}
