import type { BonusPointsStrategy } from './bonus-strategy.js';

export class NoBonusStrategy implements BonusPointsStrategy {
  pointsFor(): number {
    return 0;
  }
}
