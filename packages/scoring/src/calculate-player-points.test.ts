import { describe, expect, it } from 'vitest';
import { calculatePlayerPoints } from './calculate-player-points.js';
import type { MatchPlayerStats } from './types.js';

const stats = (overrides: Partial<MatchPlayerStats> = {}): MatchPlayerStats => ({
  fixtureId: 'f1', playerId: 'p1', position: 'MIDFIELDER', minutes: 0, goals: 0,
  assists: 0, goalsConcededWhilePlaying: 0, saves: 0, penaltiesSaved: 0,
  penaltiesMissed: 0, yellowCards: 0, redCards: 0, ownGoals: 0, ...overrides,
});

describe('player scoring', () => {
  it.each([[0, 0], [1, 1], [59, 1], [60, 2], [90, 2]])(
    'awards appearance at %i minutes', (minutes, points) => {
      expect(calculatePlayerPoints(stats({ minutes })).breakdown.appearance).toBe(points);
    },
  );

  it.each([['GOALKEEPER', 10], ['DEFENDER', 6], ['MIDFIELDER', 5], ['FORWARD', 4]] as const)(
    'awards a %s goal', (position, points) => {
      expect(calculatePlayerPoints(stats({ position, goals: 1 })).breakdown.goals).toBe(points);
    },
  );

  it('awards assists and goalkeeper saves', () => {
    const result = calculatePlayerPoints(stats({ position: 'GOALKEEPER', assists: 1, saves: 6 }));
    expect(result.breakdown.assists).toBe(3);
    expect(result.breakdown.saves).toBe(2);
  });

  it('requires 60 minutes for a clean sheet', () => {
    expect(calculatePlayerPoints(stats({ position: 'DEFENDER', minutes: 59 })).breakdown.cleanSheet).toBe(0);
    expect(calculatePlayerPoints(stats({ position: 'DEFENDER', minutes: 60 })).breakdown.cleanSheet).toBe(4);
  });

  it('uses goals conceded only while the player was on the pitch', () => {
    const result = calculatePlayerPoints(stats({ position: 'DEFENDER', minutes: 70, goalsConcededWhilePlaying: 0 }));
    expect(result.breakdown.cleanSheet).toBe(4);
    expect(result.breakdown.goalsConceded).toBe(0);
  });

  it('scores disciplinary and penalty events independently', () => {
    const result = calculatePlayerPoints(stats({ penaltiesSaved: 1, penaltiesMissed: 1,
      yellowCards: 1, redCards: 1, ownGoals: 1 }));
    expect(result.breakdown.penalties).toBe(3);
    expect(result.breakdown.cards).toBe(-4);
    expect(result.breakdown.ownGoals).toBe(-2);
  });
});
