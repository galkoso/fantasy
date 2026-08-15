import { describe, expect, it } from 'vitest';
import type { TeamScorePlayer } from './calculate-team-score.js';
import { calculateTeamScore } from './calculate-team-score.js';

const player = (id: string, position: TeamScorePlayer['position'], points = 2, minutes = 90): TeamScorePlayer =>
  ({ id, position, points, minutes });
const base = () => ({
  starters: [player('g', 'GOALKEEPER'), player('d1', 'DEFENDER'), player('d2', 'DEFENDER'),
    player('d3', 'DEFENDER'), player('m1', 'MIDFIELDER'), player('m2', 'MIDFIELDER'),
    player('m3', 'MIDFIELDER'), player('m4', 'MIDFIELDER'), player('f1', 'FORWARD'),
    player('f2', 'FORWARD'), player('f3', 'FORWARD')],
  benchGoalkeeper: player('bg', 'GOALKEEPER', 7),
  benchOutfield: [player('d4', 'DEFENDER', 6), player('m5', 'MIDFIELDER', 5), player('f4', 'FORWARD', 4)],
  captainPlayerId: 'm1', viceCaptainPlayerId: 'f1', activeChip: null, transferCost: 4,
});

describe('calculateTeamScore', () => {
  it('applies captain points and transfer costs', () => {
    const result = calculateTeamScore(base());
    expect(result.grossPoints).toBe(24);
    expect(result.totalPoints).toBe(20);
  });

  it('promotes the vice captain and performs legal substitutions', () => {
    const input = base();
    input.starters[4] = player('m1', 'MIDFIELDER', 0, 0);
    const result = calculateTeamScore(input);
    expect(result.substitutions).toEqual([{ outPlayerId: 'm1', inPlayerId: 'd4' }]);
    expect(result.players.find(({ playerId }) => playerId === 'f1')?.multiplier).toBe(2);
  });

  it('counts all fifteen players for bench boost', () => {
    const input = base(); input.activeChip = 'BENCH_BOOST'; input.transferCost = 0;
    expect(calculateTeamScore(input).players).toHaveLength(15);
  });
});
