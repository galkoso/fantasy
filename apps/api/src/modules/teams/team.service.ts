import { randomUUID } from 'node:crypto';
import { defaultSeasonRules, validateCaptains, validateLineup, validateSquad } from '@ligat-fantasy/domain';
import type { OwnedPlayer } from '@ligat-fantasy/domain';
import type { PlayerRepository } from '../players/player.repository.js';
import type { TeamRepository } from './team.repository.js';
import type { FantasyTeamDocument, ReplaceSquadInput } from './team.types.js';

export class TeamService {
  constructor(
    private readonly teams: TeamRepository,
    private readonly players: PlayerRepository,
  ) {}

  async getOrCreate(userId: string): Promise<FantasyTeamDocument> {
    const existing = await this.teams.findByUser(userId);
    if (existing) return existing;
    const now = new Date();
    const team: FantasyTeamDocument = {
      id: randomUUID(), userId, name: 'My Ligat XI', bank: defaultSeasonRules.budget,
      squad: [], starters: [], bench: [], overallPoints: 0, freeTransfers: 1,
      version: 0, createdAt: now, updatedAt: now,
    };
    await this.teams.save(team);
    return team;
  }

  async replaceSquad(userId: string, input: ReplaceSquadInput): Promise<FantasyTeamDocument> {
    const team = await this.getOrCreate(userId);
    const players = await this.players.byIds(input.playerIds);
    const squad: OwnedPlayer[] = players.map((player) => ({ ...player, currentPrice: player.price, purchasePrice: player.price }));
    const cost = squad.reduce((sum, player) => sum + player.currentPrice, 0);
    validateSquad(squad, defaultSeasonRules.budget - cost);
    const updated: FantasyTeamDocument = {
      ...team, name: input.name, bank: defaultSeasonRules.budget - cost,
      squad: squad.map(({ id, purchasePrice }) => ({ playerId: id, purchasePrice })),
      version: team.version + 1, updatedAt: new Date(),
    };
    await this.teams.save(updated);
    return updated;
  }

  async updateLineup(userId: string, starters: string[], bench: string[]): Promise<FantasyTeamDocument> {
    const team = await this.getOrCreate(userId);
    const playerMap = new Map((await this.players.byIds(team.squad.map(({ playerId }) => playerId)))
      .map((player) => [player.id, player]));
    const lineupPlayers = starters.map((id) => ({ id, position: playerMap.get(id)!.position }));
    const benchPlayers = bench.map((id) => ({ id, position: playerMap.get(id)!.position }));
    validateLineup({ starters: lineupPlayers,
      benchGoalkeeper: benchPlayers.find(({ position }) => position === 'GOALKEEPER')!,
      benchOutfield: benchPlayers.filter(({ position }) => position !== 'GOALKEEPER') });
    const updated = { ...team, starters, bench, version: team.version + 1, updatedAt: new Date() };
    await this.teams.save(updated);
    return updated;
  }

  async updateCaptains(userId: string, captainPlayerId: string, viceCaptainPlayerId: string): Promise<FantasyTeamDocument> {
    const team = await this.getOrCreate(userId);
    validateCaptains(team.starters, captainPlayerId, viceCaptainPlayerId);
    const updated = { ...team, captainPlayerId, viceCaptainPlayerId, version: team.version + 1, updatedAt: new Date() };
    await this.teams.save(updated);
    return updated;
  }
}
