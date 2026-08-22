export interface ExternalTeam {
  externalId: string;
  name: string;
  logo?: string;
  seasonExternalId?: string;
  leagueExternalId?: string;
  leagueName?: string;
  seasonName?: string;
}

export interface ExternalPlayer {
  externalId?: string;
  name: string;
  shirtNumber?: number;
  position?: string;
  positionRaw?: string;
  birthDate?: string;
  age?: number;
  photo?: string;
}

export interface FootballDataProvider {
  getTeams(): Promise<ExternalTeam[]>;
  getSquad(team: ExternalTeam): Promise<ExternalPlayer[]>;
}

export interface LeagueDiscovery {
  leagueExternalId: string;
  leagueName: string;
  seasonExternalId: string;
  seasonName: string;
  teams: ExternalTeam[];
}

export interface ParsedLeaguePage extends LeagueDiscovery {
  gamesBox: string;
  gamesRound: string;
  roundIds: string[];
}
