import { collections } from '@ligat-fantasy/database';
import type { Db } from 'mongodb';
import { DomainError } from '@ligat-fantasy/domain';
import type { TeamRepository } from './team.repository.js';

export class SnapshotService {
  constructor(private readonly db: Db, private readonly teams: TeamRepository) {}

  async submit(userId: string, gameweekId: string): Promise<object> {
    const team = await this.teams.findByUser(userId);
    if (!team || team.squad.length !== 15 || team.starters.length !== 11 || !team.captainPlayerId || !team.viceCaptainPlayerId) {
      throw new DomainError('INVALID_SQUAD_COMPOSITION', 'Complete the squad and lineup before submitting');
    }
    const gameweek = await this.db.collection(collections.gameweeks).findOne({ id: gameweekId });
    if (!gameweek || new Date(gameweek.deadline as string) <= new Date()) {
      throw new DomainError('GAMEWEEK_LOCKED', 'The Gameweek deadline has passed');
    }
    const snapshot = { gameweekId, fantasyTeamId: team.id, starters: team.starters,
      bench: team.bench, captainPlayerId: team.captainPlayerId,
      viceCaptainPlayerId: team.viceCaptainPlayerId, activeChip: null,
      squad: team.squad, bank: team.bank, submittedAt: new Date() };
    await this.db.collection(collections.snapshots).updateOne(
      { gameweekId, fantasyTeamId: team.id }, { $set: snapshot }, { upsert: true });
    return (await this.db.collection(collections.snapshots).findOne({ gameweekId, fantasyTeamId: team.id }))!;
  }
}
