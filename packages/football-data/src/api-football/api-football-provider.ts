import type { PlayerPosition } from '@ligat-fantasy/contracts';
import type { FootballDataProvider } from '../football-data-provider.js';
import type { ProviderClub, ProviderFixture, ProviderPlayer, ProviderPlayerStats } from '../types.js';
import type { ApiClub, ApiFixture, ApiPlayer, ApiResponse, ApiTeamStats } from './api-football.types.js';

export interface ApiFootballOptions { baseUrl: string; apiKey: string; leagueId: number; season: number }

export class ApiFootballProvider implements FootballDataProvider {
  constructor(private readonly options: ApiFootballOptions) {}

  async getClubs(): Promise<ProviderClub[]> {
    const data = await this.get<ApiClub>(`/teams?league=${this.options.leagueId}&season=${this.options.season}`);
    return data.map(({ team }) => ({ providerId: team.id, name: team.name,
      shortName: team.code ?? team.name.slice(0, 3).toUpperCase(), logoUrl: team.logo }));
  }

  async getPlayers(): Promise<ProviderPlayer[]> {
    const path = `/players?league=${this.options.leagueId}&season=${this.options.season}`;
    const data = await this.getAllPages<ApiPlayer>(path);
    return data.flatMap(({ player, statistics }) => statistics[0] ? [{ providerId: player.id,
      clubProviderId: statistics[0].team.id, name: player.name,
      position: mapPosition(statistics[0].games.position) }] : []);
  }

  async getFixtures(date?: Date): Promise<ProviderFixture[]> {
    const dateQuery = date ? `&date=${date.toISOString().slice(0, 10)}` : '';
    const data = await this.get<ApiFixture>(`/fixtures?league=${this.options.leagueId}&season=${this.options.season}${dateQuery}`);
    return data.map((item) => {
      const gameweekNumber = roundNumber(item.league.round);
      return { providerId: item.fixture.id, kickoffAt: new Date(item.fixture.date),
        status: mapStatus(item.fixture.status.short), homeClubProviderId: item.teams.home.id,
        awayClubProviderId: item.teams.away.id, homeGoals: item.goals.home,
        awayGoals: item.goals.away, ...(gameweekNumber === undefined ? {} : { gameweekNumber }) };
    });
  }

  async getPlayerStats(fixtureProviderId: number): Promise<ProviderPlayerStats[]> {
    const teams = await this.get<ApiTeamStats>(`/fixtures/players?fixture=${fixtureProviderId}`);
    return teams.flatMap((team) => team.players.flatMap((entry) => {
      const stats = entry.statistics[0];
      if (!stats) return [];
      return [{ fixtureProviderId, playerProviderId: entry.player.id, clubProviderId: team.team.id,
        position: mapPosition(stats.games.position), minutes: stats.games.minutes ?? 0,
        goals: stats.goals.total ?? 0, assists: stats.goals.assists ?? 0,
        goalsConcededWhilePlaying: stats.goals.conceded, saves: stats.goals.saves ?? 0,
        penaltiesSaved: stats.penalty.saved ?? 0, penaltiesMissed: stats.penalty.missed ?? 0,
        yellowCards: stats.cards.yellow, redCards: stats.cards.red, ownGoals: null,
        ...(stats.rating ? { rating: Number(stats.rating) } : {}) }];
    }));
  }

  private async get<T>(path: string): Promise<T[]> {
    return (await this.request<T>(path)).response;
  }

  private async getAllPages<T>(path: string): Promise<T[]> {
    const first = await this.request<T>(`${path}&page=1`);
    const pages = first.paging?.total ?? 1;
    const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      this.request<T>(`${path}&page=${index + 2}`)));
    return [first, ...rest].flatMap(({ response }) => response);
  }

  private async request<T>(path: string): Promise<ApiResponse<T>> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        headers: { 'x-apisports-key': this.options.apiKey }, signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return await response.json() as ApiResponse<T>;
      if (response.status !== 429 && response.status < 500) throw new Error(`API_FOOTBALL_${response.status}`);
      if (attempt < 2) await delay(500 * 2 ** attempt);
    }
    throw new Error('API_FOOTBALL_RETRY_EXHAUSTED');
  }
}

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function roundNumber(round: string): number | undefined {
  const value = /(?:^|\D)(\d+)\s*$/.exec(round)?.[1];
  return value ? Number(value) : undefined;
}

function mapStatus(status: string): ProviderFixture['status'] {
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(status)) return 'LIVE';
  if (['FT', 'AET', 'PEN'].includes(status)) return 'FINISHED';
  if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(status)) return 'POSTPONED';
  return 'SCHEDULED';
}

function mapPosition(position: string): PlayerPosition {
  if (position === 'G') return 'GOALKEEPER';
  if (position === 'D') return 'DEFENDER';
  if (position === 'F') return 'FORWARD';
  return 'MIDFIELDER';
}
