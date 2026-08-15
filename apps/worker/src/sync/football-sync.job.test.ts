import { describe, expect, it } from 'vitest';
import type { ProviderFixture } from '@ligat-fantasy/football-data';
import { buildGameweekUpsert } from './football-sync.job.js';

describe('buildGameweekUpsert', () => {
  it('does not update the same path with multiple MongoDB operators', () => {
    const fixture: ProviderFixture = {
      providerId: 1,
      kickoffAt: new Date('2024-08-24T17:00:00Z'),
      status: 'SCHEDULED',
      homeClubProviderId: 2,
      awayClubProviderId: 3,
      homeGoals: null,
      awayGoals: null,
      gameweekNumber: 1,
    };

    const { update } = buildGameweekUpsert(fixture, 'fixture-1', 2024, 'gameweek-1',
      new Date('2024-08-01T00:00:00Z'));
    const paths = Object.values(update).flatMap((fields) => Object.keys(fields));

    expect(paths).toHaveLength(new Set(paths).size);
  });
});
