import { loadConfig } from '@ligat-fantasy/config';
import { connectDatabase, ensureIndexes } from '@ligat-fantasy/database';
import { buildPoolingApp } from './app.js';
import { IsraeliFaPoolingService } from './israeli-fa-pooling.service.js';

const config = loadConfig();
const connection = await connectDatabase(config.MONGODB_URI);
await ensureIndexes(connection.db);

const pooling = IsraeliFaPoolingService.fromConfig(connection.db, config);
const app = await buildPoolingApp({ config, pooling });

void pooling.syncSquads().catch((error: unknown) => {
  app.log.error({ error: error instanceof Error ? error.message : 'UNKNOWN_SYNC_ERROR' }, 'israeli-fa.sync.failed');
});
scheduleDaily(config.SQUAD_SYNC_HOUR_UTC, config.SQUAD_SYNC_INTERVAL_MS, () => {
  void pooling.syncSquads().catch((error: unknown) => {
    app.log.error({ error: error instanceof Error ? error.message : 'UNKNOWN_SYNC_ERROR' }, 'israeli-fa.sync.failed');
  });
});

const close = async () => { await app.close(); await connection.client.close(); };
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
await app.listen({ host: config.ISRAELI_FA_POOLING_HOST, port: config.ISRAELI_FA_POOLING_PORT });

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
