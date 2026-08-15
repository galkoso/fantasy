import { describe, expect, it } from 'vitest';
import type { PlayerParticipation } from '../types.js';
import { applyAutoSubstitutions } from './auto-substitutions.js';

const player = (id: string, position: PlayerParticipation['position'], minutes = 90): PlayerParticipation =>
  ({ id, position, minutes });

describe('automatic substitutions', () => {
  it('skips a substitute that would create an illegal formation', () => {
    const starters = [player('g', 'GOALKEEPER'), player('d1', 'DEFENDER', 0),
      player('d2', 'DEFENDER'), player('d3', 'DEFENDER'), player('m1', 'MIDFIELDER'),
      player('m2', 'MIDFIELDER'), player('m3', 'MIDFIELDER'), player('m4', 'MIDFIELDER'),
      player('f1', 'FORWARD'), player('f2', 'FORWARD'), player('f3', 'FORWARD')];
    const result = applyAutoSubstitutions(starters, player('bg', 'GOALKEEPER'), [
      player('f4', 'FORWARD'), player('d4', 'DEFENDER'), player('m5', 'MIDFIELDER'),
    ]);
    expect(result.substitutions).toEqual([{ outPlayerId: 'd1', inPlayerId: 'd4' }]);
  });

  it('only replaces a goalkeeper with the bench goalkeeper', () => {
    const starters = [player('g', 'GOALKEEPER', 0), ...Array.from({ length: 3 }, (_, i) => player(`d${i}`, 'DEFENDER')),
      ...Array.from({ length: 4 }, (_, i) => player(`m${i}`, 'MIDFIELDER')),
      ...Array.from({ length: 3 }, (_, i) => player(`f${i}`, 'FORWARD'))];
    expect(applyAutoSubstitutions(starters, player('bg', 'GOALKEEPER'), []).substitutions[0])
      .toEqual({ outPlayerId: 'g', inPlayerId: 'bg' });
  });
});
