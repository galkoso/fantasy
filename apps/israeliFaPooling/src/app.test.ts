import type { FastifyInstance } from 'fastify';
import { loadConfig } from '@ligat-fantasy/config';
import { afterEach, describe, expect, it } from 'vitest';
import { buildPoolingApp } from './app.js';
import { IsraeliFaPoolingService } from './israeli-fa-pooling.service.js';

describe('israeliFaPooling', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => { if (app) await app.close(); });

  it('POST /sync-squads returns sync statistics for an admin', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST', url: '/sync-squads', headers: { 'x-user-id': 'local-demo-user' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ teamsFetched: 14, playersFetched: 367, failedTeams: [] });
  });

  it('POST /sync-squads rejects a non-admin user', async () => {
    app = await buildTestApp();
    const response = await app.inject({
      method: 'POST', url: '/sync-squads', headers: { 'x-user-id': 'not-admin' },
    });
    expect(response.statusCode).toBe(403);
  });
});

async function buildTestApp(): Promise<FastifyInstance> {
  return buildPoolingApp({
    config: loadConfig({ ADMIN_USER_IDS: 'local-demo-user' }),
    pooling: new IsraeliFaPoolingService({
      syncIsraeliPremierLeagueSquads: async () => ({
        leagueName: 'ליגת WINNER', season: '2026/2027',
        teamsFetched: 14, teamsCreated: 0, teamsUpdated: 14,
        playersFetched: 367, playersCreated: 6, playersUpdated: 361, playersDeactivated: 4,
        failedTeams: [], durationMs: 12,
      }),
    }),
  });
}
