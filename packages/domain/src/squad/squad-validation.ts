import type { PlayerPosition } from '@ligat-fantasy/contracts';
import { DomainError } from '../errors/domain-error.js';
import { defaultSeasonRules, type FantasySeasonRules } from '../rules/season-rules.js';
import type { OwnedPlayer } from '../types.js';

export function validateSquad(
  squad: OwnedPlayer[],
  bank: number,
  rules: FantasySeasonRules = defaultSeasonRules,
): void {
  if (squad.length !== rules.squadSize) {
    throw new DomainError('INVALID_SQUAD_COMPOSITION', `Squad must contain ${rules.squadSize} players`);
  }
  if (bank < 0) throw new DomainError('INSUFFICIENT_BUDGET', 'Squad exceeds available budget');

  const ids = new Set(squad.map(({ id }) => id));
  if (ids.size !== squad.length) {
    throw new DomainError('PLAYER_ALREADY_OWNED', 'A player cannot appear twice');
  }

  const positions = countBy(squad, ({ position }) => position);
  for (const [position, expected] of Object.entries(rules.squadComposition)) {
    if ((positions.get(position as PlayerPosition) ?? 0) !== expected) {
      throw new DomainError('INVALID_SQUAD_COMPOSITION', `Squad needs ${expected} ${position}`);
    }
  }

  const clubs = countBy(squad, ({ clubId }) => clubId);
  if ([...clubs.values()].some((count) => count > rules.clubPlayerLimit)) {
    throw new DomainError('MAX_PLAYERS_FROM_CLUB', `Maximum ${rules.clubPlayerLimit} players per club`);
  }
}

function countBy<T, K>(items: T[], selector: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
