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

export type FantasyChip = 'WILDCARD' | 'FREE_HIT' | 'BENCH_BOOST' | 'TRIPLE_CAPTAIN';

export interface GameweekTeamSnapshotDto {
  fantasyTeamId: string;
  gameweekId: string;
  squad: SquadMemberDto[];
  starters: string[];
  bench: string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  activeChip: FantasyChip | null;
  bank: number;
  submittedAt: string;
}

export interface GameweekUserScoreDto {
  fantasyTeamId: string;
  gameweekId: string;
  grossPoints: number;
  transferCost: number;
  totalPoints: number;
  provisional: boolean;
  rank?: number;
}
