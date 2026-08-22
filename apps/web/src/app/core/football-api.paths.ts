import type { FootballPlayerFilters } from '@ligat-fantasy/contracts';

export const FOOTBALL_API_BASE = 'http://localhost:3000';

export function footballTeamsUrl(): string {
  return `${FOOTBALL_API_BASE}/api/football/teams`;
}

export function footballTeamPlayersUrl(teamId: string): string {
  return `${FOOTBALL_API_BASE}/api/football/teams/${teamId}/players`;
}

export function footballPlayersUrl(): string {
  return `${FOOTBALL_API_BASE}/api/football/players`;
}

export function footballMeUrl(): string {
  return `${FOOTBALL_API_BASE}/api/me`;
}

export function footballSyncSquadsUrl(): string {
  return `${FOOTBALL_API_BASE}/api/admin/football/sync-squads`;
}

export function buildPlayersParams(filters: FootballPlayerFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.teamId) params['teamId'] = filters.teamId;
  if (filters.position) params['position'] = filters.position;
  if (filters.search) params['search'] = filters.search;
  if (filters.active !== undefined) params['active'] = String(filters.active);
  if (filters.includeInactive) params['includeInactive'] = 'true';
  return params;
}
