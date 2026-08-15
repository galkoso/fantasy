import type { ProviderClub, ProviderFixture, ProviderPlayer, ProviderPlayerStats } from './types.js';

export interface FootballDataProvider {
  getClubs(): Promise<ProviderClub[]>;
  getPlayers(): Promise<ProviderPlayer[]>;
  getFixtures(date?: Date): Promise<ProviderFixture[]>;
  getPlayerStats(fixtureProviderId: number): Promise<ProviderPlayerStats[]>;
}
