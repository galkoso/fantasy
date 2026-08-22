import { loadConfig } from '@ligat-fantasy/config';
import { connectDatabase, ensureIndexes } from '@ligat-fantasy/database';
import { AccessTokenService } from './access-token.service.js';
import { buildUsersApp } from './app.js';
import { AuthService } from './auth.service.js';
import { MongoUsersStore } from './mongo-users.store.js';

const config = loadConfig();
const connection = await connectDatabase(config.MONGODB_URI);
await ensureIndexes(connection.db);

const auth = new AuthService(
  new MongoUsersStore(connection.db),
  new AccessTokenService(config.JWT_ACCESS_SECRET, config.JWT_ACCESS_EXPIRES_IN_SECONDS),
  { adminUserIds: config.ADMIN_USER_IDS },
);
const app = await buildUsersApp({ config, auth });

const close = async () => { await app.close(); await connection.client.close(); };
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
await app.listen({ host: config.USERS_HOST, port: config.USERS_PORT });
