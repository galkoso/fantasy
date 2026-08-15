import type { PlayerPosition } from '@ligat-fantasy/contracts';
import type { FootballDataProvider } from '../football-data-provider.js';
import type { ProviderFixture, ProviderPlayerStats } from '../types.js';
import type { ApiFixture, ApiResponse, ApiTeamStats } from './api-football.types.js';

export interface ApiFootballOptions { baseUrl: string; apiKey: string; leagueId: number; season: number }

export class ApiFootballProvider implements FootballDataProvider {
  constructor(private readonly options: ApiFootballOptions) {}

  async getFixtures(date: Date): Promise<ProviderFixture[]> {
    const day = date.toISOString().slice(0, 10);
    const data = await this.get<ApiFixture>(`/fixtures?league=${this.options.leagueId}&season=${this.options.season}&date=${day}`);
    return data.map((item) => ({
      providerId: item.fixture.id, kickoffAt: new Date(item.fixture.date), status: mapStatus(item.fixture.status.short),
      homeClubProviderId: item.teams.home.id, awayClubProviderId: item.teams.away.id,
      homeGoals: item.goals.home, awayGoals: item.goals.away,
    }));
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
    const response = await fetch(`${this.options.baseUrl}${path}`, { headers: { 'x-apisports-key': this.options.apiKey } });
    if (!response.ok) throw new Error(`API_FOOTBALL_${response.status}`);
    return (await response.json() as ApiResponse<T>).response;
  }
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
