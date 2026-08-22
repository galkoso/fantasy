import type { PlayerDocument, TeamDocument } from '@ligat-fantasy/database';
import { ObjectId, type AnyBulkWriteOperation, type Db, type Filter, type UpdateFilter } from 'mongodb';
import { describe, expect, it } from 'vitest';
import type { ExternalPlayer, ExternalTeam, FootballDataProvider } from '../football-data-provider.js';
import { ScrapeValidationError } from '../israeli-fa/validation.js';
import { SquadSyncService, buildPlayerBulkOps } from './squad-sync.service.js';

const silentLogger = { info() {}, warn() {}, error() {} };

describe('SquadSyncService', () => {
  it('does not put the same path in both $set and $setOnInsert for player upserts', () => {
    const ops = buildPlayerBulkOps([
      { name: 'Dor Peretz', teamId: new ObjectId(), externalId: '10', position: 'MIDFIELDER' },
    ], new Date());
    const first = ops[0];
    expect(first && 'updateOne' in first).toBe(true);
    if (!first || !('updateOne' in first)) return;
    const update = first.updateOne.update as { $set: Record<string, unknown>; $setOnInsert: Record<string, unknown> };
    const overlap = Object.keys(update.$set).filter((key) => key in update.$setOnInsert);
    expect(overlap).toEqual([]);
    expect(update.$set.providerIds).toEqual({ israeliFa: '10' });
    expect(update.$setOnInsert.createdAt).toBeInstanceOf(Date);
  });
  it('upserts teams by Israeli FA id and does not create duplicates on a second run', async () => {
    const { db, store } = memoryDb();
    const client = fakeProvider({ teams: [team('1061', 'Maccabi Tel Aviv')], squads: { 1061: [player('10', 'Dor Peretz')] } });
    const sync = new SquadSyncService(db, client, testOptions(), silentLogger);
    const first = await sync.syncIsraeliPremierLeagueSquads();
    const second = await sync.syncIsraeliPremierLeagueSquads();
    expect(first.teamsFetched).toBe(1);
    expect(first.teamsCreated).toBe(1);
    expect(second.teamsCreated).toBe(0);
    expect(second.teamsUpdated).toBe(1);
    expect(store.teams).toHaveLength(1);
    expect(store.teams[0]?.providerIds.israeliFa).toBe('1061');
    expect(store.teams[0]?._id).toBeInstanceOf(ObjectId);
  });

  it('upserts players by provider id and does not create duplicates on a second run', async () => {
    const { db, store } = memoryDb();
    const client = fakeProvider({ teams: [team('1061', 'Maccabi Tel Aviv')], squads: { 1061: [player('10', 'Dor Peretz')] } });
    const sync = new SquadSyncService(db, client, testOptions(), silentLogger);
    await sync.syncIsraeliPremierLeagueSquads();
    await sync.syncIsraeliPremierLeagueSquads();
    expect(store.players).toHaveLength(1);
    expect(store.players[0]?.providerIds.israeliFa).toBe('10');
    expect(store.players[0]?.active).toBe(true);
  });

  it('updates the existing player teamId when the player transfers between league teams', async () => {
    const { db, store } = memoryDb();
    await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv'), team('2', 'Maccabi Haifa')],
      squads: { 1: [player('10', 'Dor Peretz')], 2: [player('20', 'Dolev Haziza')] },
    }), testOptions(), silentLogger).syncIsraeliPremierLeagueSquads();
    const originalId = store.players.find((item) => item.providerIds.israeliFa === '10')?._id;
    await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv'), team('2', 'Maccabi Haifa')],
      squads: { 1: [player('99', 'Other')], 2: [player('10', 'Dor Peretz', { shirtNumber: 8 }), player('20', 'Dolev Haziza')] },
    }), testOptions(), silentLogger).syncIsraeliPremierLeagueSquads();
    const peretz = store.players.find((item) => item.providerIds.israeliFa === '10');
    expect(store.players.filter((item) => item.providerIds.israeliFa === '10')).toHaveLength(1);
    expect(peretz?._id).toEqual(originalId);
    expect(peretz?.teamId).toEqual(store.teams.find((item) => item.providerIds.israeliFa === '2')?._id);
    expect(peretz?.shirtNumber).toBe(8);
  });

  it('marks players missing from a successful squad fetch as inactive instead of deleting them', async () => {
    const { db, store } = memoryDb();
    await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv')],
      squads: { 1: [player('10', 'Dor Peretz'), player('11', 'Eran Zahavi')] },
    }), testOptions(), silentLogger).syncIsraeliPremierLeagueSquads();
    const result = await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv')],
      squads: { 1: [player('10', 'Dor Peretz')] },
    }), testOptions(), silentLogger).syncIsraeliPremierLeagueSquads();
    expect(result.playersDeactivated).toBe(1);
    expect(store.players).toHaveLength(2);
    expect(store.players.find((item) => item.providerIds.israeliFa === '10')?.active).toBe(true);
    expect(store.players.find((item) => item.providerIds.israeliFa === '11')?.active).toBe(false);
  });

  it('continues syncing other teams when one squad request fails', async () => {
    const { db, store } = memoryDb();
    await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv'), team('2', 'Maccabi Haifa')],
      squads: { 1: [player('10', 'Dor Peretz')], 2: [player('20', 'Dolev Haziza')] },
    }), testOptions(), silentLogger).syncIsraeliPremierLeagueSquads();
    const result = await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv'), team('2', 'Maccabi Haifa')],
      squads: { 1: [player('10', 'Dor Peretz')] },
      failures: { 2: new Error('SQUAD_HTTP_500') },
    }), testOptions(), silentLogger).syncIsraeliPremierLeagueSquads();
    expect(result.failedTeams).toEqual([{ teamId: '2', teamName: 'Maccabi Haifa', reason: 'SQUAD_HTTP_500' }]);
    expect(result.playersFetched).toBe(1);
    expect(store.players.find((item) => item.providerIds.israeliFa === '10')?.active).toBe(true);
    expect(store.players.find((item) => item.providerIds.israeliFa === '20')?.active).toBe(true);
  });

  it('aborts without writing or deactivating when the league scrape returns zero teams', async () => {
    const { db, store } = memoryDb();
    store.teams.push({
      _id: new ObjectId(), name: 'Existing', providerIds: { israeliFa: '1' },
      league: { providerId: '40', name: 'ליגת WINNER' }, season: { providerId: '28', name: '2026/2027' },
      active: true, createdAt: new Date(), updatedAt: new Date(), lastSyncedAt: new Date(),
    });
    await expect(new SquadSyncService(db, fakeProvider({ teams: [], squads: {} }), testOptions(), silentLogger)
      .syncIsraeliPremierLeagueSquads()).rejects.toBeInstanceOf(ScrapeValidationError);
    expect(store.teams).toHaveLength(1);
    expect(store.teams[0]?.active).toBe(true);
    expect(store.players).toHaveLength(0);
  });

  it('does not mass-deactivate when the full scrape returns an implausibly small squad', async () => {
    const { db, store } = memoryDb();
    await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv')],
      squads: { 1: [player('10', 'Dor Peretz'), player('11', 'Eran Zahavi')] },
    }), testOptions(), silentLogger).syncIsraeliPremierLeagueSquads();
    const result = await new SquadSyncService(db, fakeProvider({
      teams: [team('1', 'Maccabi Tel Aviv')],
      squads: { 1: [player('10', 'Dor Peretz')] },
    }), { minTeams: 1, minPlayers: 50, minSquadPlayers: 1 }, silentLogger).syncIsraeliPremierLeagueSquads();
    expect(result.playersFetched).toBe(1);
    expect(result.playersDeactivated).toBe(0);
    expect(store.players.find((item) => item.providerIds.israeliFa === '11')?.active).toBe(true);
  });
});

function testOptions() {
  return { minTeams: 1, minPlayers: 1, minSquadPlayers: 1 };
}

function team(id: string, name: string): ExternalTeam {
  return {
    externalId: id, name, leagueExternalId: '40', leagueName: 'ליגת WINNER',
    seasonExternalId: '28', seasonName: '2026/2027',
  };
}

function player(id: string, name: string, extra: Partial<ExternalPlayer> = {}): ExternalPlayer {
  return { externalId: id, name, position: 'MIDFIELDER', shirtNumber: 10, ...extra };
}

function fakeProvider(input: {
  teams: ExternalTeam[];
  squads: Record<string, ExternalPlayer[]>;
  failures?: Record<string, Error>;
}): FootballDataProvider {
  return {
    async getTeams() { return input.teams; },
    async getSquad(team) {
      const failure = input.failures?.[team.externalId];
      if (failure) throw failure;
      return input.squads[team.externalId] ?? [];
    },
  };
}

interface MemoryStore { teams: TeamDocument[]; players: PlayerDocument[] }

function memoryDb(): { db: Db; store: MemoryStore } {
  const store: MemoryStore = { teams: [], players: [] };
  const db = {
    collection(name: string) {
      const documents = name === 'teams' ? store.teams : store.players;
      return {
        async bulkWrite(operations: AnyBulkWriteOperation<TeamDocument | PlayerDocument>[]) {
          let matchedCount = 0;
          let upsertedCount = 0;
          for (const operation of operations) {
            if (!('updateOne' in operation)) continue;
            const { filter, update, upsert } = operation.updateOne;
            const index = documents.findIndex((document) => matches(document, filter));
            if (index >= 0) {
              matchedCount += 1;
              documents[index] = applyUpdate(documents[index]!, update);
            } else if (upsert) {
              documents.push(applyInsert(update));
              upsertedCount += 1;
            }
          }
          return { matchedCount, upsertedCount, modifiedCount: matchedCount };
        },
        find(filter: Filter<TeamDocument | PlayerDocument>) {
          const found = documents.filter((document) => matches(document, filter));
          return { project() { return this; }, async toArray() { return found; } };
        },
        async updateMany(filter: Filter<PlayerDocument>, update: UpdateFilter<PlayerDocument>) {
          let modifiedCount = 0;
          for (const [index, document] of documents.entries()) {
            if (!matches(document, filter)) continue;
            documents[index] = applyUpdate(document, update);
            modifiedCount += 1;
          }
          return { modifiedCount };
        },
      };
    },
  };
  return { db: db as unknown as Db, store };
}

function matches(document: object, filter: object): boolean {
  const record = filter as Record<string, unknown>;
  const { $or, $nor, $and, ...rest } = record;
  if ($or && !($or as object[]).some((clause) => matches(document, clause))) return false;
  if ($nor && !($nor as object[]).every((clause) => !matches(document, clause))) return false;
  if ($and && !($and as object[]).every((clause) => matches(document, clause))) return false;
  return Object.entries(rest).every(([key, expected]) => {
    const actual = readPath(document, key);
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof ObjectId) && !(expected instanceof Date)) {
      const operator = expected as { $in?: unknown[]; $nin?: unknown[]; $ne?: unknown; $exists?: boolean };
      if (operator.$in) return operator.$in.some((value) => same(actual, value));
      if (operator.$nin) return !operator.$nin.some((value) => same(actual, value));
      if ('$ne' in operator) return !same(actual, operator.$ne);
      if (operator.$exists === false) return actual === undefined;
      if (operator.$exists === true) return actual !== undefined;
    }
    return same(actual, expected);
  });
}

function readPath(document: object, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) =>
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, document);
}

function same(left: unknown, right: unknown): boolean {
  if (left instanceof ObjectId && right instanceof ObjectId) return left.equals(right);
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  return left === right;
}

function applyUpdate<T extends TeamDocument | PlayerDocument>(document: T, update: object): T {
  const patch = update as { $set?: Record<string, unknown> };
  const next = { ...document, ...flattenNested(patch.$set) } as T;
  if (patch.$set?.['providerIds.israeliFa'] && typeof next === 'object') {
    (next as TeamDocument).providerIds = {
      ...(next as TeamDocument).providerIds,
      israeliFa: String(patch.$set['providerIds.israeliFa']),
    };
  }
  return next;
}

function flattenNested(set: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!set) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(set)) {
    if (!key.includes('.')) result[key] = value;
  }
  return result;
}

function applyInsert<T extends TeamDocument | PlayerDocument>(update: object): T {
  const patch = update as { $set?: Record<string, unknown>; $setOnInsert?: Record<string, unknown> };
  const document = { _id: new ObjectId(), ...patch.$setOnInsert, ...flattenNested(patch.$set) } as T;
  if (patch.$set?.['providerIds.israeliFa']) {
    (document as TeamDocument).providerIds = {
      ...(document as TeamDocument).providerIds,
      israeliFa: String(patch.$set['providerIds.israeliFa']),
    };
  }
  return document;
}
