import { describe, expect, it } from 'vitest';
import { captainMultipliers } from './captain.js';

describe('captain multipliers', () => {
  it('multiplies a playing captain', () => {
    expect(captainMultipliers('c', 'v', new Map([['c', 80]])).get('c')).toBe(2);
  });

  it('promotes the vice captain when the captain does not play', () => {
    const result = captainMultipliers('c', 'v', new Map([['c', 0], ['v', 12]]));
    expect(result.get('c')).toBeUndefined();
    expect(result.get('v')).toBe(2);
  });

  it('does not multiply either when both do not play', () => {
    expect(captainMultipliers('c', 'v', new Map()).size).toBe(0);
  });
});
