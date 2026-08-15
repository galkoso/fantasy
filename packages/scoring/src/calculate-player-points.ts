import type { BonusPointsStrategy } from './bonus/bonus-strategy.js';
import { NoBonusStrategy } from './bonus/no-bonus-strategy.js';
import type { MatchPlayerStats, PlayerPointResult, PointBreakdown } from './types.js';

const goalPoints = { GOALKEEPER: 10, DEFENDER: 6, MIDFIELDER: 5, FORWARD: 4 } as const;
const cleanSheetPoints = { GOALKEEPER: 4, DEFENDER: 4, MIDFIELDER: 1, FORWARD: 0 } as const;

export function calculatePlayerPoints(
  stats: MatchPlayerStats,
  bonusStrategy: BonusPointsStrategy = new NoBonusStrategy(),
): PlayerPointResult {
  const breakdown: PointBreakdown = {
    appearance: appearancePoints(stats.minutes),
    goals: stats.goals * goalPoints[stats.position],
    assists: stats.assists * 3,
    cleanSheet: stats.minutes >= 60 && stats.goalsConcededWhilePlaying === 0
      ? cleanSheetPoints[stats.position] : 0,
    goalsConceded: (stats.position === 'GOALKEEPER' || stats.position === 'DEFENDER') &&
      (stats.goalsConcededWhilePlaying ?? 0) >= 2 ? -Math.floor(stats.goalsConcededWhilePlaying! / 2) : 0,
    saves: stats.position === 'GOALKEEPER' ? Math.floor(stats.saves / 3) : 0,
    penalties: stats.penaltiesSaved * 5 - stats.penaltiesMissed * 2,
    cards: -stats.yellowCards - stats.redCards * 3,
    ownGoals: (stats.ownGoals ?? 0) * -2,
    bonus: bonusStrategy.pointsFor(stats),
  };
  return { total: Object.values(breakdown).reduce((sum, points) => sum + points, 0), breakdown };
}

function appearancePoints(minutes: number): number {
  if (minutes <= 0) return 0;
  return minutes < 60 ? 1 : 2;
}
