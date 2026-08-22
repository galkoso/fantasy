import { describe, expect, it } from 'vitest';
import { buildPlayersParams, footballPlayersUrl, footballSyncSquadsUrl, footballTeamPlayersUrl, footballTeamsUrl } from './football-api.paths';

describe('FootballApiService paths', () => {
  it('points team listing at the backend football API', () => {
    expect(footballTeamsUrl()).toBe('http://localhost:3000/api/football/teams');
  });

  it('points a team squad at the backend football API', () => {
    expect(footballTeamPlayersUrl('507f1f77bcf86cd799439011'))
      .toBe('http://localhost:3000/api/football/teams/507f1f77bcf86cd799439011/players');
  });

  it('points player search at the backend football API', () => {
    expect(footballPlayersUrl()).toBe('http://localhost:3000/api/football/players');
  });

  it('points squad synchronization at the admin backend endpoint', () => {
    expect(footballSyncSquadsUrl()).toBe('http://localhost:3000/api/admin/football/sync-squads');
  });
});

describe('buildPlayersParams', () => {
  it('omits empty filters', () => {
    expect(buildPlayersParams({})).toEqual({});
  });

  it('sets teamId, position, and search query params', () => {
    expect(buildPlayersParams({ teamId: 'abc', position: 'MIDFIELDER', search: 'peretz' })).toEqual({
      teamId: 'abc', position: 'MIDFIELDER', search: 'peretz',
    });
  });
});
