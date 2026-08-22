import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/ligat_fantasy'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  ISRAELI_FA_BASE_URL: z.url().default('https://www.football.org.il'),
  ISRAELI_FA_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  ISRAELI_FA_REQUEST_DELAY_MS: z.coerce.number().int().nonnegative().default(1_500),
  ISRAELI_FA_LEAGUE_ID: z.string().default('40'),
  SQUAD_SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(86_400_000),
  SQUAD_SYNC_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(2),
  ADMIN_USER_IDS: z.string().default('local-demo-user').transform((value) =>
    value.split(',').map((id) => id.trim()).filter((id) => id.length > 0)),
  WEB_ORIGIN: z.string().default('http://localhost:4200'),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  return environmentSchema.parse(environment);
}
