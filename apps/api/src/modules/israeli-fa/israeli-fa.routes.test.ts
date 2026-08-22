import type { FastifyInstance } from 'fastify';
import { loadConfig } from '@ligat-fantasy/config';
import type { PlayerDocument, TeamDocument } from '@ligat-fantasy/database';
import { ObjectId, type Db, type Filter } from 'mongodb';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { IsraeliFaService } from './israeli-fa.service.js';

const teamId = new ObjectId();
const otherTeamId = new ObjectId();
const playerId = new ObjectId();
const inactiveId = new ObjectId();

describe('Israeli FA HTTP routes', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => { if (app) await app.close(); });

  it('GET /api/israeli-fa/teams returns active teams with player counts', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: '/api/israeli-fa/teams' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      { id: teamId.toHexString(), name: 'Maccabi Tel Aviv', logo: 'mta.png', playerCount: 1 },
    ]);
  });

  it('GET /api/israeli-fa/teams/:teamId/players returns active squad players', async () => {
    app = await buildTestApp();
    const response = await app.inject({ method: 'GET', url: `/api/israeli-fa/teams/${teamId.toHexString()}/players` });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: playerId.toHexString(), name: 'Dor Peretz', teamId: teamId.toHexString(),
        number: 10, position: 'MIDFIELDER', age: 31,
      },
    ]);
  });

  it('GET /api/israeli-fa/players supports team, position, and search filters', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'GET',
      url: `/api/israeli-fa/players?teamId=${teamId.toHexString()}&position=MIDFIELDER&search=peretz`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
    expect(response.json()[0].name).toBe('Dor Peretz');
  });
});

async function buildTestApp(): Promise<FastifyInstance> {
  const now = new Date();
  const teams: TeamDocument[] = [
    {
      _id: teamId, name: 'Maccabi Tel Aviv', logo: 'mta.png', providerIds: { israeliFa: '1061' },
      league: { providerId: '40', name: 'ליגת WINNER' }, season: { providerId: '28', name: '2026/2027' },
      active: true, createdAt: now, updatedAt: now, lastSyncedAt: now,
    },
    {
      _id: otherTeamId, name: 'Inactive Club', providerIds: { israeliFa: '999' },
      league: { providerId: '40', name: 'ליגת WINNER' }, season: { providerId: '27' },
      active: false, createdAt: now, updatedAt: now, lastSyncedAt: now,
    },
  ];
  const players: PlayerDocument[] = [
    {
      _id: playerId, name: 'Dor Peretz', shirtNumber: 10, position: 'MIDFIELDER', age: 31,
      teamId, providerIds: { israeliFa: '12345' }, active: true, createdAt: now, updatedAt: now, lastSyncedAt: now,
    },
    {
      _id: inactiveId, name: 'Old Player', teamId, providerIds: { israeliFa: '1' },
      active: false, createdAt: now, updatedAt: now, lastSyncedAt: now,
    },
  ];
  const db = memoryDb(teams, players);
  return buildApp({
    db,
    config: loadConfig({ ADMIN_USER_IDS: 'local-demo-user' }),
    israeliFa: new IsraeliFaService(db),
  });
}

function memoryDb(teams: TeamDocument[], players: PlayerDocument[]): Db {
  const collections: Record<string, Array<TeamDocument | PlayerDocument>> = { teams, players };
  return {
    collection(name: string) {
      const documents = collections[name] ?? [];
      return {
        find(filter: Filter<TeamDocument | PlayerDocument> = {}) {
          const found = documents.filter((document) => matches(document, filter));
          const cursor = {
            sort() { return cursor; },
            limit() { return cursor; },
            async toArray() { return found; },
          };
          return cursor;
        },
        async findOne(filter: Filter<TeamDocument>) {
          return documents.find((document) => matches(document, filter)) ?? null;
        },
        aggregate() {
          const counts = new Map<string, number>();
          for (const player of players) {
            if (!player.active) continue;
            const key = player.teamId.toHexString();
            counts.set(key, (counts.get(key) ?? 0) + 1);
          }
          const rows = [...counts.entries()].map(([_id, count]) => ({ _id: new ObjectId(_id), count }));
          return { async toArray() { return rows; } };
        },
      };
    },
  } as unknown as Db;
}

function matches(document: object, filter: object): boolean {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = key.includes('.')
      ? key.split('.').reduce<unknown>((value, part) =>
        value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined, document)
      : (document as Record<string, unknown>)[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof ObjectId)
      && '$regex' in (expected as object)) {
      const { $regex, $options } = expected as { $regex: string; $options?: string };
      return new RegExp($regex, $options).test(String(actual ?? ''));
    }
    if (leftIsObjectId(actual) && leftIsObjectId(expected)) return actual.equals(expected);
    return actual === expected;
  });
}

function leftIsObjectId(value: unknown): value is ObjectId {
  return value instanceof ObjectId;
}
