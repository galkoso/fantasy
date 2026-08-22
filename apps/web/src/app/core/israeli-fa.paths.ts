import type { FootballPlayerFilters } from '@ligat-fantasy/contracts';
import { API_BASE, ISRAELI_FA_POOLING_BASE } from './api-base';

export function israeliFaTeamsUrl(): string {
  return `${API_BASE}/api/israeli-fa/teams`;
}

export function israeliFaTeamPlayersUrl(teamId: string): string {
  return `${API_BASE}/api/israeli-fa/teams/${teamId}/players`;
}

export function israeliFaPlayersUrl(): string {
  return `${API_BASE}/api/israeli-fa/players`;
}

export function israeliFaSyncSquadsUrl(): string {
  return `${ISRAELI_FA_POOLING_BASE}/sync-squads`;
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
