import type { ObjectId } from 'mongodb';

export interface TeamDocument {
  _id: ObjectId;
  name: string;
  logo?: string;
  providerIds: { israeliFa?: string };
  league: { providerId?: string; name: string };
  season: { providerId?: string; name?: string };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
}

export type UserRole = 'user' | 'admin';

export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerDocument {
  _id: ObjectId;
  name: string;
  shirtNumber?: number;
  position?: string;
  positionRaw?: string;
  birthDate?: Date;
  age?: number;
  photo?: string;
  providerName?: string;
  teamId: ObjectId;
  providerIds: { israeliFa?: string };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
}
