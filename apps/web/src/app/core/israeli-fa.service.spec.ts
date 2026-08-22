import { describe, expect, it } from 'vitest';
import { buildPlayersParams, israeliFaPlayersUrl, israeliFaSyncSquadsUrl, israeliFaTeamPlayersUrl, israeliFaTeamsUrl } from './israeli-fa.paths';

describe('IsraeliFaService paths', () => {
  it('points team listing at the Israeli FA backend', () => {
    expect(israeliFaTeamsUrl()).toBe('http://localhost:3000/api/israeli-fa/teams');
  });

  it('points a team squad at the Israeli FA backend', () => {
    expect(israeliFaTeamPlayersUrl('507f1f77bcf86cd799439011'))
      .toBe('http://localhost:3000/api/israeli-fa/teams/507f1f77bcf86cd799439011/players');
  });

  it('points player search at the Israeli FA backend', () => {
    expect(israeliFaPlayersUrl()).toBe('http://localhost:3000/api/israeli-fa/players');
  });

  it('points squad synchronization at israeliFaPooling', () => {
    expect(israeliFaSyncSquadsUrl()).toBe('http://localhost:3001/sync-squads');
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
