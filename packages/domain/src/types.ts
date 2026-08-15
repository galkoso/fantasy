import type { PlayerPosition } from '@ligat-fantasy/contracts';

export interface FantasyPlayer {
  id: string;
  clubId: string;
  position: PlayerPosition;
  currentPrice: number;
}

export interface OwnedPlayer extends FantasyPlayer {
  purchasePrice: number;
}

export interface LineupPlayer {
  id: string;
  position: PlayerPosition;
}

export interface PlayerParticipation extends LineupPlayer {
  minutes: number;
}

export interface LineupSelection {
  starters: LineupPlayer[];
  benchGoalkeeper: LineupPlayer;
  benchOutfield: LineupPlayer[];
}
