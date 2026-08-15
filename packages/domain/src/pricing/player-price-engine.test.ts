import { describe, expect, it } from 'vitest';
import { calculateNextPrice } from './player-price-engine.js';

describe('player price engine', () => {
  it('moves by one integer unit when configurable demand is reached', () => {
    expect(calculateNextPrice({ currentPrice: 50, transfersIn: 20, transfersOut: 3, totalTeams: 100 })).toBe(51);
    expect(calculateNextPrice({ currentPrice: 50, transfersIn: 2, transfersOut: 20, totalTeams: 100 })).toBe(49);
  });

  it('does not move below the demand threshold', () => {
    expect(calculateNextPrice({ currentPrice: 50, transfersIn: 9, transfersOut: 0, totalTeams: 100 })).toBe(50);
  });
});
