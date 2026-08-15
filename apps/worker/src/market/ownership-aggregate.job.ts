import { collections } from '@ligat-fantasy/database';
import type { Db } from 'mongodb';

interface Ownership { _id: string; count: number }
interface TransferCount { _id: string; count: number }

export class OwnershipAggregateJob {
  private running = false;
  constructor(private readonly db: Db) {}

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const teamCount = await this.db.collection(collections.fantasyTeams).countDocuments();
      const [ownership, transfersIn, transfersOut] = await Promise.all([
        this.db.collection(collections.fantasyTeams).aggregate<Ownership>([
          { $unwind: '$squad' }, { $group: { _id: '$squad.playerId', count: { $sum: 1 } } },
        ]).toArray(),
        this.transferCounts('playerInId'), this.transferCounts('playerOutId'),
      ]);
      const owned = new Map(ownership.map((entry) => [entry._id, entry.count]));
      const incoming = new Map(transfersIn.map((entry) => [entry._id, entry.count]));
      const outgoing = new Map(transfersOut.map((entry) => [entry._id, entry.count]));
      const players = await this.db.collection(collections.players).find({}, { projection: { id: 1 } }).toArray();
      if (players.length) await this.db.collection(collections.players).bulkWrite(players.map(({ id }) => ({
        updateOne: { filter: { id }, update: { $set: {
          selectedByPercent: teamCount ? Number((((owned.get(id) ?? 0) / teamCount) * 100).toFixed(1)) : 0,
          transfersIn: incoming.get(id) ?? 0, transfersOut: outgoing.get(id) ?? 0,
        } } },
      })));
    } finally { this.running = false; }
  }

  private transferCounts(field: 'playerInId' | 'playerOutId'): Promise<TransferCount[]> {
    return this.db.collection(collections.transfers).aggregate<TransferCount>([
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]).toArray();
  }
}
