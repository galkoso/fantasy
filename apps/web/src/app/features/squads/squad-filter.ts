import { SQUAD_POSITION_LABELS, type FootballPlayerSummary, type SquadPosition, type SquadSyncResult } from '@ligat-fantasy/contracts';

export const POSITION_FILTERS: Array<{ value: 'All' | SquadPosition; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'GOALKEEPER', label: 'Goalkeepers' },
  { value: 'DEFENDER', label: 'Defenders' },
  { value: 'MIDFIELDER', label: 'Midfielders' },
  { value: 'ATTACKER', label: 'Attackers' },
];

export function filterSquad(
  players: FootballPlayerSummary[],
  filters: { search?: string; position?: 'All' | SquadPosition },
): FootballPlayerSummary[] {
  const search = filters.search?.trim().toLowerCase() ?? '';
  const position = filters.position ?? 'All';
  return players.filter((player) => {
    if (position !== 'All' && player.position !== position) return false;
    if (search && !player.name.toLowerCase().includes(search)) return false;
    return true;
  });
}

export function positionLabel(position: string | undefined): string | undefined {
  if (!position) return undefined;
  return SQUAD_POSITION_LABELS[position as SquadPosition] ?? position;
}

export function formatSyncResult(result: SquadSyncResult): string {
  return `${result.teamsFetched} teams and ${result.playersFetched} players synchronized.`;
}
