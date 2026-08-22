import { loadConfig } from '@ligat-fantasy/config';
import { connectDatabase, ensureIndexes } from '@ligat-fantasy/database';
import { buildApp } from './app.js';
import { IsraeliFaService } from './modules/israeli-fa/israeli-fa.service.js';

const config = loadConfig();
const connection = await connectDatabase(config.MONGODB_URI);
await ensureIndexes(connection.db);

const israeliFa = new IsraeliFaService(connection.db);
const app = await buildApp({ db: connection.db, config, israeliFa });

const close = async () => { await app.close(); await connection.client.close(); };
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
await app.listen({ host: config.API_HOST, port: config.API_PORT });
