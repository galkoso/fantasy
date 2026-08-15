import type { PlayerPosition } from '@ligat-fantasy/contracts';

export interface MatchPlayerStats {
  fixtureId: string;
  playerId: string;
  position: PlayerPosition;
  minutes: number;
  goals: number;
  assists: number;
  goalsConcededWhilePlaying: number | null;
  saves: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number | null;
  rating?: number;
}

export interface PointBreakdown {
  appearance: number;
  goals: number;
  assists: number;
  cleanSheet: number;
  goalsConceded: number;
  saves: number;
  penalties: number;
  cards: number;
  ownGoals: number;
  bonus: number;
}

export interface PlayerPointResult {
  total: number;
  breakdown: PointBreakdown;
}
