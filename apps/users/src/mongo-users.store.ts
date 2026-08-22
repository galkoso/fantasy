import { collections, type UserDocument } from '@ligat-fantasy/database';
import type { Db, ObjectId } from 'mongodb';
import type { UsersStore } from './users.store.js';

export class MongoUsersStore implements UsersStore {
  constructor(private readonly db: Db) {}

  async findByEmail(email: string): Promise<UserDocument | undefined> {
    return await this.db.collection<UserDocument>(collections.users).findOne({ email }) ?? undefined;
  }

  async findById(id: ObjectId): Promise<UserDocument | undefined> {
    return await this.db.collection<UserDocument>(collections.users).findOne({ _id: id }) ?? undefined;
  }

  async insert(user: UserDocument): Promise<'ok' | 'duplicate-email'> {
    try {
      await this.db.collection<UserDocument>(collections.users).insertOne(user);
      return 'ok';
    } catch (error) {
      if (isDuplicateKey(error)) return 'duplicate-email';
      throw error;
    }
  }
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}
