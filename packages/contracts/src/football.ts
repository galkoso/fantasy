export type PlayerPosition = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

export interface ClubSummary {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
}

export interface PlayerSummary {
  id: string;
  clubId: string;
  name: string;
  position: PlayerPosition;
  price: number;
  totalPoints: number;
  selectedByPercent: number;
  form: number;
  status: 'AVAILABLE' | 'DOUBTFUL' | 'UNAVAILABLE';
}

export interface GameweekSummary {
  id: string;
  number: number;
  name: string;
  status: 'UPCOMING' | 'OPEN' | 'LOCKED' | 'LIVE' | 'FINALIZING' | 'FINAL';
  deadline: string;
}
