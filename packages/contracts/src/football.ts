export const SQUAD_POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'ATTACKER'] as const;
export type SquadPosition = (typeof SQUAD_POSITIONS)[number];

export const SQUAD_POSITION_LABELS: Record<SquadPosition, string> = {
  GOALKEEPER: 'Goalkeeper',
  DEFENDER: 'Defender',
  MIDFIELDER: 'Midfielder',
  ATTACKER: 'Attacker',
};

export interface FootballTeamSummary {
  id: string;
  name: string;
  logo?: string;
  playerCount: number;
}

export interface FootballPlayerSummary {
  id: string;
  name: string;
  teamId: string;
  number?: number;
  position?: string;
  photo?: string;
  age?: number;
}

export interface FootballPlayerFilters {
  teamId?: string;
  position?: SquadPosition;
  search?: string;
  active?: boolean;
  includeInactive?: boolean;
}

export interface FailedTeamSync {
  teamId: string;
  teamName: string;
  reason: string;
}

export interface SquadSyncResult {
  leagueName: string;
  season?: string;
  teamsFetched: number;
  teamsCreated: number;
  teamsUpdated: number;
  playersFetched: number;
  playersCreated: number;
  playersUpdated: number;
  playersDeactivated: number;
  failedTeams: FailedTeamSync[];
  durationMs: number;
}
