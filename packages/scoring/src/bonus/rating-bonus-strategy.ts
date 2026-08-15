import type { BonusPointsStrategy } from './bonus-strategy.js';
import type { MatchPlayerStats } from '../types.js';

export class RatingBonusStrategy implements BonusPointsStrategy {
  constructor(private readonly pointsByPlayerId: ReadonlyMap<string, number>) {}

  pointsFor(stats: MatchPlayerStats): number {
    return this.pointsByPlayerId.get(stats.playerId) ?? 0;
  }

  static fromFixture(players: MatchPlayerStats[]): RatingBonusStrategy {
    const ranked = players
      .filter((player) => player.minutes > 0 && player.rating !== undefined)
      .sort((a, b) => b.rating! - a.rating! || a.playerId.localeCompare(b.playerId));
    return new RatingBonusStrategy(new Map(ranked.slice(0, 3).map((player, index) => [player.playerId, 3 - index])));
  }
}
