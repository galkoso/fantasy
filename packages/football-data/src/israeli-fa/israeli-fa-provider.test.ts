import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { IsraeliFaHttpClient } from './http-client.js';
import { IsraeliFaProvider } from './israeli-fa-provider.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (name: string) => readFileSync(join(fixtures, name), 'utf8');

describe('IsraeliFaProvider', () => {
  it('loads current Ligat Winner teams from the public games ASMX endpoint', async () => {
    const pages = new Map<string, string>([
      ['/leagues/league/?league_id=40', read('league-page-ajax.html')],
      ['/Components.asmx/LeagueGamesList?league_id=40&season_id=28&box=10&round_id=1&componentTitle=', read('games-list.xml')],
    ]);
    const http = new IsraeliFaHttpClient(
      { baseUrl: 'https://www.football.org.il', timeoutMs: 1000, requestDelayMs: 0 },
      { info() {}, warn() {} },
      async (url) => {
        const path = new URL(url).pathname + new URL(url).search;
        const body = pages.get(path);
        if (!body) return { ok: false, status: 404, text: async () => '' };
        return { ok: true, status: 200, text: async () => body };
      },
    );
    const teams = await new IsraeliFaProvider(http, { leagueId: '40' }).getTeams();
    expect(teams).toHaveLength(8);
    expect(teams.map((team) => team.externalId)).toContain('1061');
    expect(teams.find((team) => team.externalId === '1061')?.name).toBe('מכבי ת"א');
  });
});
