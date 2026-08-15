export interface SquadMemberDto {
  playerId: string;
  purchasePrice: number;
}

export interface FantasyTeamDto {
  id: string;
  name: string;
  bank: number;
  squad: SquadMemberDto[];
  starters: string[];
  bench: string[];
  captainPlayerId?: string;
  viceCaptainPlayerId?: string;
  overallPoints: number;
  overallRank?: number;
  freeTransfers: number;
}

export interface DashboardDto {
  team: FantasyTeamDto;
  currentGameweek: { id: string; number: number; status: string; deadline: string };
  gameweekPoints: number;
  provisional: boolean;
}
