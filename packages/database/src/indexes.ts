import type { Db } from 'mongodb';
import { collections as names } from './collections.js';

export async function ensureIndexes(db: Db): Promise<void> {
  const teams = db.collection(names.teams);
  const players = db.collection(names.players);
  await Promise.all([
    dropIndex(teams, 'providerIds.apiFootball_1'),
    dropIndex(teams, 'leagueId_1_season_1'),
    dropIndex(players, 'providerIds.apiFootball_1'),
    dropIndex(players, 'leagueId_1_season_1'),
    dropIndex(players, 'leagueId_1_season_1_active_1'),
  ]);
  await Promise.all([
    teams.createIndexes([
      {
        key: { 'providerIds.israeliFa': 1 }, unique: true,
        partialFilterExpression: { 'providerIds.israeliFa': { $type: 'string' } },
      },
      { key: { active: 1 } },
    ]),
    players.createIndexes([
      {
        key: { 'providerIds.israeliFa': 1 }, unique: true,
        partialFilterExpression: { 'providerIds.israeliFa': { $type: 'string' } },
      },
      { key: { teamId: 1 } },
      { key: { active: 1 } },
      { key: { position: 1 } },
      { key: { name: 1 } },
    ]),
  ]);
}

async function dropIndex(collection: { dropIndex(name: string): Promise<unknown> }, name: string): Promise<void> {
  try {
    await collection.dropIndex(name);
  } catch {
    return;
  }
}
