import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { buildPlayerFilter } from './football.repository.js';

describe('buildPlayerFilter', () => {
  it('returns active players by default', () => {
    expect(buildPlayerFilter({})).toEqual({ active: true });
  });

  it('filters by teamId', () => {
    const teamId = new ObjectId().toHexString();
    expect(buildPlayerFilter({ teamId })).toEqual({ active: true, teamId: new ObjectId(teamId) });
  });

  it('filters by normalized position', () => {
    expect(buildPlayerFilter({ position: 'MIDFIELDER' })).toEqual({ active: true, position: 'MIDFIELDER' });
  });

  it('filters by case-insensitive escaped name search', () => {
    expect(buildPlayerFilter({ search: 'peretz' })).toEqual({
      active: true, name: { $regex: 'peretz', $options: 'i' },
    });
    expect(buildPlayerFilter({ search: 'a.b' })).toEqual({
      active: true, name: { $regex: 'a\\.b', $options: 'i' },
    });
  });

  it('includes inactive players when requested', () => {
    expect(buildPlayerFilter({ includeInactive: true })).toEqual({});
    expect(buildPlayerFilter({ includeInactive: true, active: false })).toEqual({ active: false });
  });
});
