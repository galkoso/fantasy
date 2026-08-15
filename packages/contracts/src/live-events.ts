export type LiveEventType =
  | 'MATCH_SCORE_CHANGED'
  | 'PLAYER_POINTS_UPDATED'
  | 'GAMEWEEK_POINTS_UPDATED'
  | 'RANK_UPDATED';

export interface LiveEvent<T = unknown> {
  id: string;
  type: LiveEventType;
  occurredAt: string;
  payload: T;
}
