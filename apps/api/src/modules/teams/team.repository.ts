import { collections } from '@ligat-fantasy/database';
import type { ClientSession, Db } from 'mongodb';
import type { FantasyTeamDocument, TransferDocument } from './team.types.js';

export class TeamRepository {
  constructor(private readonly db: Db) {}

  findByUser(userId: string): Promise<FantasyTeamDocument | null> {
    return this.db.collection<FantasyTeamDocument>(collections.fantasyTeams).findOne({ userId });
  }

  async save(team: FantasyTeamDocument): Promise<void> {
    await this.db.collection<FantasyTeamDocument>(collections.fantasyTeams)
      .replaceOne({ userId: team.userId }, team, { upsert: true });
  }

  async replaceVersioned(
    team: FantasyTeamDocument,
    expectedVersion: number,
    session: ClientSession,
  ): Promise<boolean> {
    const result = await this.db.collection<FantasyTeamDocument>(collections.fantasyTeams)
      .replaceOne({ userId: team.userId, version: expectedVersion }, team, { session });
    return result.modifiedCount === 1;
  }

  async recordTransfer(transfer: TransferDocument, session: ClientSession): Promise<void> {
    await this.db.collection<TransferDocument>(collections.transfers).insertOne(transfer, { session });
  }
}
