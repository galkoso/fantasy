import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../../app.js';
import { requestUserId } from '../../shared/request-user.js';
import { PlayerRepository } from '../players/player.repository.js';
import { TeamRepository } from './team.repository.js';
import { TeamService } from './team.service.js';
import { TransferService } from './transfer.service.js';
import { SnapshotService } from './snapshot.service.js';

const squadSchema = z.object({ name: z.string().trim().min(2).max(40), playerIds: z.array(z.string()).length(15) });
const lineupSchema = z.object({ starters: z.array(z.string()).length(11), bench: z.array(z.string()).length(4) });
const captainSchema = z.object({ captainPlayerId: z.string(), viceCaptainPlayerId: z.string() });
const transferSchema = z.object({ playerOutId: z.string(), playerInId: z.string() });

export async function registerTeamRoutes(app: FastifyInstance, context: AppContext): Promise<void> {
  const teamRepository = new TeamRepository(context.db);
  const playerRepository = new PlayerRepository(context.db);
  const service = new TeamService(teamRepository, playerRepository);
  const transfers = new TransferService(context.client, context.db, teamRepository, playerRepository);
  const snapshots = new SnapshotService(context.db, teamRepository);
  app.get('/fantasy-team', (request) => service.getOrCreate(requestUserId(request)));
  app.put('/fantasy-team/squad', (request) => service.replaceSquad(requestUserId(request), squadSchema.parse(request.body)));
  app.put('/fantasy-team/lineup', (request) => {
    const input = lineupSchema.parse(request.body);
    return service.updateLineup(requestUserId(request), input.starters, input.bench);
  });
  app.put('/fantasy-team/captain', (request) => {
    const input = captainSchema.parse(request.body);
    return service.updateCaptains(requestUserId(request), input.captainPlayerId, input.viceCaptainPlayerId);
  });
  app.post('/transfers', (request) =>
    transfers.execute(requestUserId(request), transferSchema.parse(request.body)));
  app.get('/transfers', async (request) => {
    const team = await teamRepository.findByUser(requestUserId(request));
    if (!team) return [];
    return context.db.collection('transfers').find({ fantasyTeamId: team.id })
      .sort({ createdAt: -1 }).limit(100).toArray();
  });
  app.post('/fantasy-team/gameweeks/:gameweekId/submit', (request) => {
    const { gameweekId } = z.object({ gameweekId: z.string() }).parse(request.params);
    return snapshots.submit(requestUserId(request), gameweekId);
  });
}
