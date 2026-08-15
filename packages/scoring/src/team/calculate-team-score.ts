import type { FantasyChip, PlayerPosition } from '@ligat-fantasy/contracts';
import { applyAutoSubstitutions, captainMultipliers } from '@ligat-fantasy/domain';

export interface TeamScorePlayer {
  id: string;
  position: PlayerPosition;
  points: number;
  minutes: number;
}

export interface TeamScoreInput {
  starters: TeamScorePlayer[];
  benchGoalkeeper: TeamScorePlayer;
  benchOutfield: TeamScorePlayer[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  activeChip: FantasyChip | null;
  transferCost: number;
}

export interface CountedPlayerScore {
  playerId: string;
  points: number;
  multiplier: number;
  countedPoints: number;
  fromBench: boolean;
}

export interface TeamScoreResult {
  grossPoints: number;
  transferCost: number;
  totalPoints: number;
  players: CountedPlayerScore[];
  substitutions: Array<{ outPlayerId: string; inPlayerId: string }>;
}

export function calculateTeamScore(input: TeamScoreInput): TeamScoreResult {
  const all = [...input.starters, input.benchGoalkeeper, ...input.benchOutfield];
  const byId = new Map(all.map((player) => [player.id, player]));
  const autoSubs = input.activeChip === 'BENCH_BOOST'
    ? { starters: input.starters, substitutions: [] }
    : applyAutoSubstitutions(input.starters, input.benchGoalkeeper, input.benchOutfield);
  const countedIds = new Set(autoSubs.starters.map(({ id }) => id));
  if (input.activeChip === 'BENCH_BOOST') all.forEach(({ id }) => countedIds.add(id));
  const captainMultiplier = input.activeChip === 'TRIPLE_CAPTAIN' ? 3 : 2;
  const multipliers = captainMultipliers(input.captainPlayerId, input.viceCaptainPlayerId,
    new Map(all.map(({ id, minutes }) => [id, minutes])), captainMultiplier);
  const starterIds = new Set(input.starters.map(({ id }) => id));
  const players = [...countedIds].map((playerId) => {
    const player = byId.get(playerId)!;
    const multiplier = multipliers.get(playerId) ?? 1;
    return { playerId, points: player.points, multiplier,
      countedPoints: player.points * multiplier, fromBench: !starterIds.has(playerId) };
  });
  const grossPoints = players.reduce((sum, player) => sum + player.countedPoints, 0);
  return { grossPoints, transferCost: input.transferCost,
    totalPoints: grossPoints - input.transferCost, players, substitutions: autoSubs.substitutions };
}
