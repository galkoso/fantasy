import { collections } from '@ligat-fantasy/database';
import type { GameweekSummary } from '@ligat-fantasy/contracts';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../app.js';
import { requestUserId } from '../../shared/request-user.js';
import { PlayerRepository } from '../players/player.repository.js';
import { TeamRepository } from '../teams/team.repository.js';
import { TeamService } from '../teams/team.service.js';

export async function registerDashboardRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  const teams = new TeamService(new TeamRepository(context.db), new PlayerRepository(context.db));
  app.get('/dashboard', async (request) => {
    const team = await teams.getOrCreate(requestUserId(request));
    const gameweek = await context.db.collection<GameweekSummary>(collections.gameweeks)
      .findOne({ status: { $in: ['OPEN', 'LOCKED', 'LIVE', 'FINALIZING'] } });
    const score = gameweek ? await context.db.collection(collections.gameweekScores)
      .findOne({ gameweekId: gameweek.id, fantasyTeamId: team.id }) : null;
    return {
      team,
      currentGameweek: gameweek ?? { id: 'preseason', number: 1, status: 'UPCOMING', deadline: new Date().toISOString() },
      gameweekPoints: Number(score?.totalPoints ?? 0),
      provisional: Boolean(score?.provisional),
    };
  });
}
