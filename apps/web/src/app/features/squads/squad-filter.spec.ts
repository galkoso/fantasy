import { describe, expect, it } from 'vitest';
import type { FootballPlayerSummary } from '@ligat-fantasy/contracts';
import { filterSquad, formatSyncResult, positionLabel } from './squad-filter';

const peretz = player({ name: 'Dor Peretz', position: 'MIDFIELDER' });
const zahavi = player({ name: 'Eran Zahavi', position: 'ATTACKER' });
const daniel = player({ name: 'Daniel Peretz', position: 'GOALKEEPER' });

describe('filterSquad', () => {
  it('returns all players when no filters are set', () => {
    expect(filterSquad([peretz, zahavi], {})).toEqual([peretz, zahavi]);
  });

  it('filters by normalized position', () => {
    expect(filterSquad([peretz, zahavi, daniel], { position: 'GOALKEEPER' })).toEqual([daniel]);
  });

  it('filters by player name search case-insensitively', () => {
    expect(filterSquad([peretz, zahavi, daniel], { search: 'peretz' })).toEqual([peretz, daniel]);
  });

  it('applies search and position together', () => {
    expect(filterSquad([peretz, zahavi, daniel], { search: 'peretz', position: 'MIDFIELDER' })).toEqual([peretz]);
  });
});

describe('positionLabel', () => {
  it('maps backend positions to display labels and hides missing values', () => {
    expect(positionLabel('MIDFIELDER')).toBe('Midfielder');
    expect(positionLabel(undefined)).toBeUndefined();
  });
});

describe('formatSyncResult', () => {
  it('summarizes synchronized teams and players', () => {
    expect(formatSyncResult({
      leagueName: 'ליגת WINNER', teamsFetched: 14, teamsCreated: 0, teamsUpdated: 14,
      playersFetched: 365, playersCreated: 4, playersUpdated: 361, playersDeactivated: 0,
      failedTeams: [], durationMs: 10,
    })).toBe('14 teams and 365 players synchronized.');
  });
});

function player(overrides: Partial<FootballPlayerSummary>): FootballPlayerSummary {
  return { id: overrides.name ?? 'id', name: 'Player', teamId: 'team', ...overrides };
}
