import type { MatchPlayerStats } from '../types.js';

export interface BonusPointsStrategy {
  pointsFor(stats: MatchPlayerStats): number;
}
