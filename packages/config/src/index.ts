import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/ligat_fantasy'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  API_FOOTBALL_KEY: z.string().default(''),
  API_FOOTBALL_BASE_URL: z.url().default('https://v3.football.api-sports.io'),
  API_FOOTBALL_LEAGUE_ID: z.coerce.number().int().positive().default(383),
  API_FOOTBALL_SEASON: z.coerce.number().int().default(2026),
  LIVE_FIXTURE_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  PLAYER_STATS_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(180_000),
  SSE_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(15_000),
  WEB_ORIGIN: z.string().default('http://localhost:4200'),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return environmentSchema.parse(environment);
}
