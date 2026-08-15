import type { ProviderFixture, ProviderPlayerStats } from './types.js';

export interface FootballDataProvider {
  getFixtures(date: Date): Promise<ProviderFixture[]>;
  getPlayerStats(fixtureProviderId: number): Promise<ProviderPlayerStats[]>;
}
