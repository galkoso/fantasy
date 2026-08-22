import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decodeAsmxHtmlData, parseGamesTeams } from './parse-asmx.js';
import { parseLeaguePage } from './parse-league.js';
import { parseSquadPage } from './parse-squad.js';
import { normalizePosition } from './normalize-position.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (name: string) => readFileSync(join(fixtures, name), 'utf8');

describe('parseLeaguePage', () => {
  it('reads Ligat Winner teams, season, and league ids from stable hrefs', () => {
    const discovery = parseLeaguePage(read('league-page.html'), '40');
    expect(discovery.leagueExternalId).toBe('40');
    expect(discovery.leagueName).toBe('ליגת WINNER');
    expect(discovery.seasonName).toBe('2026/2027');
    expect(discovery.seasonExternalId).toBe('28');
    expect(discovery.teams.map((team) => team.externalId)).toEqual(['1061', '1064', '1077']);
    expect(discovery.teams[0]).toMatchObject({
      name: 'מכבי תל אביב', externalId: '1061', seasonExternalId: '28', leagueExternalId: '40',
    });
    expect(discovery.teams[0]?.logo).toContain('ImageHandler.ashx');
  });

  it('ignores empty team names and duplicate provider ids', () => {
    const html = `
      <h1>2026/2027 ליגת WINNER</h1>
      <a href="/team-details/?team_id=1&season_id=28">מכבי תל אביב</a>
      <a href="/team-details/?team_id=1&season_id=28">מכבי תל אביב</a>
      <a href="/team-details/?team_id=2&season_id=28"></a>
      <a href="/leagues/league/?league_id=40&season_id=28">2026/27</a>
    `;
    expect(parseLeaguePage(html, '40').teams).toEqual([
      expect.objectContaining({ externalId: '1', name: 'מכבי תל אביב' }),
    ]);
  });

  it('reads current season and games-table ids when clubs are loaded via AJAX', () => {
    const discovery = parseLeaguePage(read('league-page-ajax.html'), '40');
    expect(discovery.teams).toEqual([]);
    expect(discovery.seasonExternalId).toBe('28');
    expect(discovery.seasonName).toBe('2026/2027');
    expect(discovery.gamesBox).toBe('10');
    expect(discovery.gamesRound).toBe('1');
    expect(discovery.roundIds).toEqual(['1', '2']);
  });
});

describe('parseGamesTeams', () => {
  it('extracts unique clubs from ASMX games HtmlData data-team attributes', () => {
    const html = decodeAsmxHtmlData(read('games-list.xml'));
    const teams = parseGamesTeams(html, {
      leagueExternalId: '40', leagueName: 'ליגת WINNER', seasonExternalId: '28', seasonName: '2026/2027',
    });
    expect(teams.map((team) => team.externalId)).toEqual(['1064', '2182', '1061', '1005', '2171', '3595', '1068', '2176']);
    expect(teams[0]).toMatchObject({ name: 'מכבי פ"ת', externalId: '1064', seasonExternalId: '28' });
  });
});

describe('parseSquadPage', () => {
  it('parses player_id links, shirt numbers, photos, and Hebrew positions', () => {
    const players = parseSquadPage(read('squad-table.html'));
    expect(players).toHaveLength(4);
    expect(players.find((player) => player.externalId === '12345')).toMatchObject({
      name: 'דור פרץ', shirtNumber: 10, position: 'MIDFIELDER', positionRaw: 'קשר',
    });
    expect(players.find((player) => player.externalId === '111')).toMatchObject({
      name: 'דניאל פרץ', position: 'GOALKEEPER', photo: expect.stringContaining('ImageHandler.ashx'),
    });
    expect(players.find((player) => player.externalId === '222')?.position).toBe('DEFENDER');
    expect(players.find((player) => player.externalId === '333')?.position).toBe('ATTACKER');
    expect(players.some((player) => player.name.includes('מאמן'))).toBe(false);
  });

  it('parses name-only squad lists and skips staff roles', () => {
    const players = parseSquadPage(read('squad-list.html'));
    expect(players.map((player) => player.name)).toEqual(['אליה דוד ראובני', 'איתי פרטוש', 'אלרואי עטייה']);
    expect(players.every((player) => !player.externalId)).toBe(true);
  });
});

describe('normalizePosition', () => {
  it('maps Hebrew position labels to internal positions', () => {
    expect(normalizePosition('שוער')).toBe('GOALKEEPER');
    expect(normalizePosition('הגנה')).toBe('DEFENDER');
    expect(normalizePosition('מגן')).toBe('DEFENDER');
    expect(normalizePosition('קשר')).toBe('MIDFIELDER');
    expect(normalizePosition('חלוץ')).toBe('ATTACKER');
  });

  it('does not invent a position from unrelated text', () => {
    expect(normalizePosition('מאמן')).toBeUndefined();
    expect(normalizePosition(undefined)).toBeUndefined();
  });
});
