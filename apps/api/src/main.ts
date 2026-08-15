import { loadConfig } from '@ligat-fantasy/config';
import { connectDatabase, ensureIndexes } from '@ligat-fantasy/database';
import { buildApp } from './app.js';
import { LiveEventBus } from './modules/live/live-event-bus.js';

const config = loadConfig();
const connection = await connectDatabase(config.MONGODB_URI);
await ensureIndexes(connection.db);
const app = await buildApp({ db: connection.db, client: connection.client, config, liveEvents: new LiveEventBus() });

const close = async () => { await app.close(); await connection.client.close(); };
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
await app.listen({ host: config.API_HOST, port: config.API_PORT });
