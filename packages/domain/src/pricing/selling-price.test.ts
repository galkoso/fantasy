import { describe, expect, it } from 'vitest';
import { calculateSellingPrice } from './selling-price.js';

describe('calculateSellingPrice', () => {
  it.each([
    [50, 54, 52],
    [50, 53, 51],
    [50, 48, 48],
    [50, 50, 50],
  ])('prices purchase %i current %i at %i', (purchase, current, expected) => {
    expect(calculateSellingPrice(purchase, current)).toBe(expected);
  });
});
