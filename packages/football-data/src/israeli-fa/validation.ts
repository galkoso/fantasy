export class ScrapeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScrapeValidationError';
  }
}

export const MIN_LEAGUE_TEAMS = 8;
export const MIN_LEAGUE_PLAYERS = 50;
export const MIN_SQUAD_PLAYERS = 1;
