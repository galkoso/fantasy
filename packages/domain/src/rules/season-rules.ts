import type { PlayerPosition } from '@ligat-fantasy/contracts';

export interface FantasySeasonRules {
  budget: number;
  squadSize: number;
  squadComposition: Record<PlayerPosition, number>;
  clubPlayerLimit: number;
  minimumStarters: Record<PlayerPosition, number>;
  freeTransferCap: number;
  additionalTransferCost: number;
  captainMultiplier: number;
  tripleCaptainMultiplier: number;
}

export const defaultSeasonRules: FantasySeasonRules = {
  budget: 1_000,
  squadSize: 15,
  squadComposition: { GOALKEEPER: 2, DEFENDER: 5, MIDFIELDER: 5, FORWARD: 3 },
  clubPlayerLimit: 3,
  minimumStarters: { GOALKEEPER: 1, DEFENDER: 3, MIDFIELDER: 2, FORWARD: 1 },
  freeTransferCap: 5,
  additionalTransferCost: 4,
  captainMultiplier: 2,
  tripleCaptainMultiplier: 3,
};
