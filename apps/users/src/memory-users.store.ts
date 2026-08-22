import type { UserDocument } from '@ligat-fantasy/database';
import type { ObjectId } from 'mongodb';
import type { UsersStore } from './users.store.js';

export class MemoryUsersStore implements UsersStore {
  constructor(private readonly users: UserDocument[] = []) {}

  async findByEmail(email: string): Promise<UserDocument | undefined> {
    return this.users.find((user) => user.email === email);
  }

  async findById(id: ObjectId): Promise<UserDocument | undefined> {
    return this.users.find((user) => user._id.equals(id));
  }

  async insert(user: UserDocument): Promise<'ok' | 'duplicate-email'> {
    if (this.users.some((existing) => existing.email === user.email)) return 'duplicate-email';
    this.users.push(user);
    return 'ok';
  }
}
