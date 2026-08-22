import type { UserDocument } from '@ligat-fantasy/database';
import type { ObjectId } from 'mongodb';

export interface UsersStore {
  findByEmail(email: string): Promise<UserDocument | undefined>;
  findById(id: ObjectId): Promise<UserDocument | undefined>;
  insert(user: UserDocument): Promise<'ok' | 'duplicate-email'>;
}
