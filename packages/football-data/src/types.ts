import type { MatchPlayerStats } from '@ligat-fantasy/scoring';

export interface ProviderFixture {
  providerId: number;
  kickoffAt: Date;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED';
  homeClubProviderId: number;
  awayClubProviderId: number;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface ProviderPlayerStats extends Omit<MatchPlayerStats, 'fixtureId' | 'playerId'> {
  fixtureProviderId: number;
  playerProviderId: number;
  clubProviderId: number;
}
