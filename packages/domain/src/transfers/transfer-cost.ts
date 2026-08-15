import { defaultSeasonRules, type FantasySeasonRules } from '../rules/season-rules.js';

export function calculateTransferHit(
  transfersMade: number,
  freeTransfers: number,
  wildcardActive = false,
  rules: FantasySeasonRules = defaultSeasonRules,
): number {
  if (wildcardActive) return 0;
  return Math.max(0, transfersMade - freeTransfers) * rules.additionalTransferCost;
}

export function nextFreeTransferBalance(
  current: number,
  transfersMade: number,
  rules: FantasySeasonRules = defaultSeasonRules,
): number {
  return Math.min(rules.freeTransferCap, Math.max(0, current - transfersMade) + 1);
}
