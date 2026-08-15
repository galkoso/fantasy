import { loadConfig } from '@ligat-fantasy/config';
import { connectDatabase, ensureIndexes } from '@ligat-fantasy/database';
import { ApiFootballProvider } from '@ligat-fantasy/football-data';
import { FootballSyncJob } from './sync/football-sync.job.js';

const config = loadConfig();
const connection = await connectDatabase(config.MONGODB_URI);
await ensureIndexes(connection.db);

if (!config.API_FOOTBALL_KEY) {
  console.warn('API_FOOTBALL_KEY is empty; football polling is disabled.');
} else {
  const provider = new ApiFootballProvider({ baseUrl: config.API_FOOTBALL_BASE_URL,
    apiKey: config.API_FOOTBALL_KEY, leagueId: config.API_FOOTBALL_LEAGUE_ID,
    season: config.API_FOOTBALL_SEASON });
  const job = new FootballSyncJob(connection.db, provider);
  await job.run(new Date());
  setInterval(() => void job.run(new Date()), config.LIVE_FIXTURE_POLL_INTERVAL_MS);
}

const close = async () => { await connection.client.close(); process.exit(0); };
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
