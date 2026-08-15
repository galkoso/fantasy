import { DomainError } from '../errors/domain-error.js';
import { defaultSeasonRules, type FantasySeasonRules } from '../rules/season-rules.js';
import type { LineupPlayer, LineupSelection } from '../types.js';

export function isValidStartingLineup(
  starters: LineupPlayer[],
  rules: FantasySeasonRules = defaultSeasonRules,
): boolean {
  if (starters.length !== 11) return false;
  const count = (position: LineupPlayer['position']) =>
    starters.filter((player) => player.position === position).length;
  return (
    count('GOALKEEPER') === 1 &&
    count('DEFENDER') >= rules.minimumStarters.DEFENDER &&
    count('MIDFIELDER') >= rules.minimumStarters.MIDFIELDER &&
    count('FORWARD') >= rules.minimumStarters.FORWARD
  );
}

export function validateLineup(selection: LineupSelection): void {
  if (!isValidStartingLineup(selection.starters)) {
    throw new DomainError('INVALID_FORMATION', 'Starting XI has an illegal formation');
  }
  if (selection.benchGoalkeeper.position !== 'GOALKEEPER' || selection.benchOutfield.length !== 3) {
    throw new DomainError('INVALID_FORMATION', 'Bench needs one goalkeeper and three outfield players');
  }
}
