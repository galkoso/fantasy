import { MongoClient, type Db } from 'mongodb';

export interface DatabaseConnection {
  client: MongoClient;
  db: Db;
}

export async function connectDatabase(uri: string): Promise<DatabaseConnection> {
  const client = new MongoClient(uri);
  await client.connect();
  const databaseName = new URL(uri).pathname.slice(1) || 'ligat_fantasy';
  return { client, db: client.db(databaseName) };
}
