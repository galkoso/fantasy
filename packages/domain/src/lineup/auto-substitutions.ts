import { isValidStartingLineup } from './formation.js';
import type { LineupPlayer, PlayerParticipation } from '../types.js';

export interface AutoSubstitutionResult {
  starters: LineupPlayer[];
  substitutions: Array<{ outPlayerId: string; inPlayerId: string }>;
}

export function applyAutoSubstitutions(
  starters: PlayerParticipation[],
  benchGoalkeeper: PlayerParticipation,
  benchOutfield: PlayerParticipation[],
): AutoSubstitutionResult {
  let result: LineupPlayer[] = [...starters];
  const substitutions: AutoSubstitutionResult['substitutions'] = [];
  const goalkeeper = starters.find(({ position }) => position === 'GOALKEEPER');

  if (goalkeeper?.minutes === 0 && benchGoalkeeper.minutes > 0) {
    result = replace(result, goalkeeper.id, benchGoalkeeper);
    substitutions.push({ outPlayerId: goalkeeper.id, inPlayerId: benchGoalkeeper.id });
  }

  for (const starter of starters.filter((player) => player.position !== 'GOALKEEPER' && player.minutes === 0)) {
    const candidate = benchOutfield.find((bench) => {
      if (bench.minutes === 0 || substitutions.some(({ inPlayerId }) => inPlayerId === bench.id)) return false;
      return isValidStartingLineup(replace(result, starter.id, bench));
    });
    if (candidate) {
      result = replace(result, starter.id, candidate);
      substitutions.push({ outPlayerId: starter.id, inPlayerId: candidate.id });
    }
  }
  return { starters: result, substitutions };
}

function replace(players: LineupPlayer[], outgoingId: string, incoming: LineupPlayer): LineupPlayer[] {
  return players.map((player) => (player.id === outgoingId ? incoming : player));
}
