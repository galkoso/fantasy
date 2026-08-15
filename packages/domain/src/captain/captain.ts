import { DomainError } from '../errors/domain-error.js';

export function validateCaptains(starterIds: string[], captainId: string, viceCaptainId: string): void {
  if (captainId === viceCaptainId || !starterIds.includes(captainId) || !starterIds.includes(viceCaptainId)) {
    throw new DomainError('INVALID_CAPTAIN', 'Captain and vice captain must be distinct starters');
  }
}

export function captainMultipliers(
  captainId: string,
  viceCaptainId: string,
  minutesByPlayer: ReadonlyMap<string, number>,
  multiplier = 2,
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  if ((minutesByPlayer.get(captainId) ?? 0) > 0) result.set(captainId, multiplier);
  else if ((minutesByPlayer.get(viceCaptainId) ?? 0) > 0) result.set(viceCaptainId, multiplier);
  return result;
}
