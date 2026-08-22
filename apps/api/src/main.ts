import { loadConfig } from '@ligat-fantasy/config';
import { connectDatabase, ensureIndexes } from '@ligat-fantasy/database';
import { createIsraeliFaSquadSync } from '@ligat-fantasy/football-data';
import { buildApp } from './app.js';

const config = loadConfig();
const connection = await connectDatabase(config.MONGODB_URI);
await ensureIndexes(connection.db);

const squadSync = createIsraeliFaSquadSync(connection.db, {
  baseUrl: config.ISRAELI_FA_BASE_URL,
  timeoutMs: config.ISRAELI_FA_REQUEST_TIMEOUT_MS,
  requestDelayMs: config.ISRAELI_FA_REQUEST_DELAY_MS,
  leagueId: config.ISRAELI_FA_LEAGUE_ID,
});
const app = await buildApp({
  db: connection.db, config,
  syncIsraeliPremierLeagueSquads: () => squadSync.syncIsraeliPremierLeagueSquads(),
});

void squadSync.syncIsraeliPremierLeagueSquads().catch((error: unknown) => {
  app.log.error({ error: error instanceof Error ? error.message : 'UNKNOWN_SYNC_ERROR' }, 'football.sync.failed');
});
scheduleDaily(config.SQUAD_SYNC_HOUR_UTC, config.SQUAD_SYNC_INTERVAL_MS, () => {
  void squadSync.syncIsraeliPremierLeagueSquads().catch((error: unknown) => {
    app.log.error({ error: error instanceof Error ? error.message : 'UNKNOWN_SYNC_ERROR' }, 'football.sync.failed');
  });
});

const close = async () => { await app.close(); await connection.client.close(); };
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
await app.listen({ host: config.API_HOST, port: config.API_PORT });

function scheduleDaily(hourUtc: number, intervalMs: number, run: () => void): void {
  const delay = millisecondsUntilUtcHour(hourUtc);
  setTimeout(() => {
    run();
    setInterval(run, intervalMs);
  }, delay);
}

function millisecondsUntilUtcHour(hourUtc: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}
