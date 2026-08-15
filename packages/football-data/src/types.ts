import type { MatchPlayerStats } from '@ligat-fantasy/scoring';
import type { PlayerPosition } from '@ligat-fantasy/contracts';

export interface ProviderFixture {
  providerId: number;
  kickoffAt: Date;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';
  homeClubProviderId: number;
  awayClubProviderId: number;
  homeGoals: number | null;
  awayGoals: number | null;
  gameweekNumber?: number;
}

export interface ProviderClub { providerId: number; name: string; shortName: string; logoUrl?: string }
export interface ProviderPlayer {
  providerId: number; clubProviderId: number; name: string;
  position: PlayerPosition;
}

export interface ProviderPlayerStats extends Omit<MatchPlayerStats, 'fixtureId' | 'playerId'> {
  fixtureProviderId: number;
  playerProviderId: number;
  clubProviderId: number;
}
