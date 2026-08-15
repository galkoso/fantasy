import type { FantasyTeamDto, SquadMemberDto } from '@ligat-fantasy/contracts';

export interface FantasyTeamDocument extends FantasyTeamDto {
  userId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReplaceSquadInput {
  name: string;
  playerIds: string[];
}

export interface TransferInput {
  playerOutId: string;
  playerInId: string;
}

export interface TransferDocument {
  fantasyTeamId: string;
  gameweekId: string;
  playerOutId: string;
  playerInId: string;
  soldPrice: number;
  purchasePrice: number;
  pointsCost: number;
  createdAt: Date;
}

export const toSquadMember = (playerId: string, purchasePrice: number): SquadMemberDto =>
  ({ playerId, purchasePrice });
