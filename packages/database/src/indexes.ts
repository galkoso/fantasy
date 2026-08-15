import type { Db } from 'mongodb';
import { collections as names } from './collections.js';

export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection(names.users).createIndex({ email: 1 }, { unique: true }),
    db.collection(names.clubs).createIndex({ 'providerIds.apiFootball': 1 }, { unique: true }),
    db.collection(names.players).createIndexes([{ key: { clubId: 1 } }, { key: { position: 1 } }]),
    db.collection(names.fixtures).createIndexes([{ key: { gameweekId: 1 } }, { key: { status: 1, kickoffAt: 1 } }]),
    db.collection(names.playerMatchStats).createIndex({ fixtureId: 1, playerId: 1 }, { unique: true }),
    db.collection(names.playerMatchPoints).createIndex({ fixtureId: 1, playerId: 1 }, { unique: true }),
    db.collection(names.gameweeks).createIndex({ season: 1, number: 1 }, { unique: true }),
    db.collection(names.fantasyTeams).createIndex({ userId: 1 }, { unique: true }),
    db.collection(names.snapshots).createIndex({ gameweekId: 1, fantasyTeamId: 1 }, { unique: true }),
    db.collection(names.gameweekScores).createIndex({ gameweekId: 1, fantasyTeamId: 1 }, { unique: true }),
    db.collection(names.transfers).createIndex({ fantasyTeamId: 1, createdAt: -1 }),
    db.collection(names.priceHistory).createIndex({ playerId: 1, effectiveAt: -1 }),
    db.collection(names.leagues).createIndex({ joinCode: 1 }, { unique: true }),
    db.collection(names.leagueMembers).createIndex({ leagueId: 1, fantasyTeamId: 1 }, { unique: true }),
    db.collection('live_events').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
