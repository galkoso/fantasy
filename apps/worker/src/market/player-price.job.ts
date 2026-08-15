import { collections } from '@ligat-fantasy/database';
import { calculateNextPrice } from '@ligat-fantasy/domain';
import type { Db } from 'mongodb';

interface PlayerMarket { id: string; price: number; transfersIn?: number; transfersOut?: number }

export class PlayerPriceJob {
  constructor(private readonly db: Db) {}

  async run(now = new Date()): Promise<void> {
    const dateKey = now.toISOString().slice(0, 10);
    const totalTeams = await this.db.collection(collections.fantasyTeams).countDocuments();
    const players = await this.db.collection<PlayerMarket>(collections.players).find().toArray();
    for (const player of players) {
      const nextPrice = calculateNextPrice({ currentPrice: player.price,
        transfersIn: player.transfersIn ?? 0, transfersOut: player.transfersOut ?? 0, totalTeams });
      if (nextPrice === player.price) continue;
      const result = await this.db.collection(collections.players).updateOne(
        { id: player.id, priceChangeDate: { $ne: dateKey } },
        { $set: { price: nextPrice, priceChangeDate: dateKey } });
      if (!result.modifiedCount) continue;
      await this.db.collection(collections.priceHistory).updateOne(
        { playerId: player.id, dateKey }, { $setOnInsert: { previousPrice: player.price,
          price: nextPrice, effectiveAt: now } }, { upsert: true });
    }
  }
}
