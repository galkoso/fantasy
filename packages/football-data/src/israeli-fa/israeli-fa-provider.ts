import type { ExternalPlayer, ExternalTeam, FootballDataProvider, LeagueDiscovery } from '../football-data-provider.js';
import type { IsraeliFaHttpClient } from './http-client.js';
import { decodeAsmxHtmlData, parseGamesTeams } from './parse-asmx.js';
import { parseLeaguePage } from './parse-league.js';
import { parseSquadPage } from './parse-squad.js';
import { IFA_SELECTORS, LIGAT_WINNER_LEAGUE_ID } from './selectors.js';

export interface IsraeliFaProviderOptions {
  leagueId?: string;
}

const MIN_TEAMS_FROM_ONE_ROUND = 8;

export class IsraeliFaProvider implements FootballDataProvider {
  private discovery: LeagueDiscovery | undefined;
  private readonly leagueId: string;

  constructor(
    private readonly http: IsraeliFaHttpClient,
    options: IsraeliFaProviderOptions = {},
  ) {
    this.leagueId = options.leagueId ?? LIGAT_WINNER_LEAGUE_ID;
  }

  async getTeams(): Promise<ExternalTeam[]> {
    return (await this.discoverLeague()).teams;
  }

  async getSquad(team: ExternalTeam): Promise<ExternalPlayer[]> {
    const seasonQuery = team.seasonExternalId ? `&season_id=${encodeURIComponent(team.seasonExternalId)}` : '';
    const squadPath = `/team-details/?team_id=${encodeURIComponent(team.externalId)}${seasonQuery}&itemid=${encodeURIComponent(IFA_SELECTORS.squadTabItemId)}`;
    const players = parseSquadPage(await this.http.get(squadPath));
    if (players.length > 0) return players;
    const teamPath = `/team-details/?team_id=${encodeURIComponent(team.externalId)}${seasonQuery}`;
    return parseSquadPage(await this.http.get(teamPath));
  }

  async discoverLeague(): Promise<LeagueDiscovery> {
    const page = parseLeaguePage(
      await this.http.get(`/leagues/league/?league_id=${encodeURIComponent(this.leagueId)}`),
      this.leagueId,
    );
    const teams = page.teams.length >= MIN_TEAMS_FROM_ONE_ROUND
      ? page.teams
      : mergeTeams(page.teams, await this.fetchTeamsFromGames(page));
    this.discovery = {
      leagueExternalId: page.leagueExternalId, leagueName: page.leagueName,
      seasonExternalId: page.seasonExternalId, seasonName: page.seasonName, teams,
    };
    return this.discovery;
  }

  private async fetchTeamsFromGames(page: ReturnType<typeof parseLeaguePage>): Promise<ExternalTeam[]> {
    const teams = new Map<string, ExternalTeam>();
    const rounds = page.roundIds.length > 0 ? page.roundIds : [page.gamesRound];
    for (const roundId of rounds) {
      const xml = await this.http.get(gamesListPath(this.leagueId, page.seasonExternalId, page.gamesBox, roundId));
      for (const team of parseGamesTeams(decodeAsmxHtmlData(xml), page)) teams.set(team.externalId, team);
      if (teams.size >= MIN_TEAMS_FROM_ONE_ROUND) break;
    }
    return [...teams.values()];
  }
}

function gamesListPath(leagueId: string, seasonId: string, box: string, roundId: string): string {
  const params = new URLSearchParams({
    league_id: leagueId, season_id: seasonId, box, round_id: roundId, componentTitle: '',
  });
  return `/Components.asmx/LeagueGamesList?${params.toString()}`;
}

function mergeTeams(primary: ExternalTeam[], extra: ExternalTeam[]): ExternalTeam[] {
  const teams = new Map(primary.map((team) => [team.externalId, team]));
  for (const team of extra) if (!teams.has(team.externalId)) teams.set(team.externalId, team);
  return [...teams.values()];
}
