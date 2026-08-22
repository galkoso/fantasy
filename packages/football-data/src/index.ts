import type { Db } from 'mongodb';
import type { FootballDataProvider } from './football-data-provider.js';
import { IsraeliFaHttpClient, type IsraeliFaHttpLogger } from './israeli-fa/http-client.js';
import { IsraeliFaProvider } from './israeli-fa/israeli-fa-provider.js';
import { SquadSyncService, type SquadSyncLogger, consoleSquadSyncLogger } from './sync/squad-sync.service.js';

export interface IsraeliFaSyncOptions {
  baseUrl: string;
  timeoutMs: number;
  requestDelayMs: number;
  leagueId: string;
}

export function createIsraeliFaProvider(options: IsraeliFaSyncOptions, logger: IsraeliFaHttpLogger = consoleSquadSyncLogger): FootballDataProvider {
  const http = new IsraeliFaHttpClient({
    baseUrl: options.baseUrl, timeoutMs: options.timeoutMs, requestDelayMs: options.requestDelayMs,
  }, logger);
  return new IsraeliFaProvider(http, { leagueId: options.leagueId });
}

export function createIsraeliFaSquadSync(
  db: Db,
  options: IsraeliFaSyncOptions,
  logger: SquadSyncLogger = consoleSquadSyncLogger,
): SquadSyncService {
  return new SquadSyncService(db, createIsraeliFaProvider(options, logger), {}, logger);
}

export * from './football-data-provider.js';
export * from './israeli-fa/http-client.js';
export * from './israeli-fa/israeli-fa-provider.js';
export * from './israeli-fa/normalize-position.js';
export * from './israeli-fa/parse-league.js';
export * from './israeli-fa/parse-squad.js';
export * from './israeli-fa/validation.js';
export * from './sync/squad-sync.service.js';
