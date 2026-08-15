export type DomainErrorCode =
  | 'INSUFFICIENT_BUDGET'
  | 'MAX_PLAYERS_FROM_CLUB'
  | 'INVALID_FORMATION'
  | 'INVALID_SQUAD_COMPOSITION'
  | 'INVALID_CAPTAIN'
  | 'GAMEWEEK_LOCKED'
  | 'TRANSFER_DEADLINE_PASSED'
  | 'PLAYER_ALREADY_OWNED'
  | 'PLAYER_NOT_IN_SQUAD';

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
