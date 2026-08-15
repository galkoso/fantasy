import { describe, expect, it } from 'vitest';
import { calculateTransferHit, nextFreeTransferBalance } from './transfer-cost.js';

describe('transfer rules', () => {
  it('charges four points for each transfer beyond the free balance', () => {
    expect(calculateTransferHit(3, 1)).toBe(8);
    expect(calculateTransferHit(2, 2)).toBe(0);
    expect(calculateTransferHit(8, 1, true)).toBe(0);
  });

  it('rolls unused transfers up to five', () => {
    expect(nextFreeTransferBalance(5, 0)).toBe(5);
    expect(nextFreeTransferBalance(3, 1)).toBe(3);
    expect(nextFreeTransferBalance(1, 2)).toBe(1);
  });
});
