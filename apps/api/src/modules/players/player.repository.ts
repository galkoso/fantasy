import { collections } from '@ligat-fantasy/database';
import type { PlayerSummary } from '@ligat-fantasy/contracts';
import type { Db, Filter } from 'mongodb';

export interface PlayerQuery {
  search?: string | undefined;
  position?: PlayerSummary['position'] | undefined;
  clubId?: string | undefined;
  maxPrice?: number | undefined;
  sort?: 'totalPoints' | 'price' | 'selectedByPercent' | 'form' | undefined;
}

export class PlayerRepository {
  constructor(private readonly db: Db) {}

  async list(query: PlayerQuery): Promise<PlayerSummary[]> {
    const filter: Filter<PlayerSummary> = {};
    if (query.search) filter.name = { $regex: escapeRegex(query.search), $options: 'i' };
    if (query.position) filter.position = query.position;
    if (query.clubId) filter.clubId = query.clubId;
    if (query.maxPrice !== undefined) filter.price = { $lte: query.maxPrice };
    const sortField = query.sort ?? 'totalPoints';
    return this.db.collection<PlayerSummary>(collections.players).find(filter).sort({ [sortField]: -1 }).limit(200).toArray();
  }

  async byIds(ids: string[]): Promise<PlayerSummary[]> {
    return this.db.collection<PlayerSummary>(collections.players).find({ id: { $in: ids } }).toArray();
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
