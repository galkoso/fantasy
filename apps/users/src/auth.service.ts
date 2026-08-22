import type { AuthUser, RegisterUserRequest } from '@ligat-fantasy/contracts';
import type { UserDocument } from '@ligat-fantasy/database';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import type { AccessTokenService } from './access-token.service.js';
import type { UsersStore } from './users.store.js';

export class AuthError extends Error {
  constructor(readonly statusCode: number, readonly code: string, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthServiceOptions {
  adminUserIds: string[];
  bcryptRounds?: number;
}

export interface AuthenticatedSession {
  accessToken: string;
  user: AuthUser;
}

export class AuthService {
  private readonly adminUserIds: string[];
  private readonly bcryptRounds: number;

  constructor(
    private readonly users: UsersStore,
    private readonly tokens: AccessTokenService,
    options: AuthServiceOptions,
  ) {
    this.adminUserIds = options.adminUserIds;
    this.bcryptRounds = options.bcryptRounds ?? 10;
  }

  async register(input: RegisterUserRequest): Promise<AuthenticatedSession> {
    const email = normalizeEmail(input.email);
    const displayName = input.displayName.trim();
    const password = input.password;
    if (displayName.length === 0) throw new AuthError(400, 'VALIDATION_ERROR', 'Display name is required');
    if (password.length < 8) throw new AuthError(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters');

    const now = new Date();
    const user: UserDocument = {
      _id: new ObjectId(), email, displayName, role: 'user',
      passwordHash: await bcrypt.hash(password, this.bcryptRounds),
      createdAt: now, updatedAt: now,
    };
    if (await this.users.insert(user) === 'duplicate-email') {
      throw new AuthError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }
    return this.sessionFor(user);
  }

  async login(email: string, password: string): Promise<AuthenticatedSession> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      throw new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    return this.sessionFor(user);
  }

  async sessionFromAccessToken(token: string): Promise<AuthUser> {
    let payload;
    try {
      payload = await this.tokens.verify(token);
    } catch {
      throw new AuthError(401, 'ACCESS_TOKEN_INVALID', 'Invalid access token');
    }
    const user = await this.users.findById(parseUserId(payload.userId));
    if (!user) throw new AuthError(401, 'ACCESS_TOKEN_INVALID', 'Invalid access token');
    return this.toAuthUser(user);
  }

  private async sessionFor(user: UserDocument): Promise<AuthenticatedSession> {
    const authUser = this.toAuthUser(user);
    return { accessToken: await this.tokens.sign({ userId: authUser.id, email: authUser.email }), user: authUser };
  }

  private toAuthUser(user: UserDocument): AuthUser {
    const id = user._id.toHexString();
    return {
      id, email: user.email, displayName: user.displayName,
      isAdmin: user.role === 'admin' || this.adminUserIds.includes(id),
    };
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseUserId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch {
    throw new AuthError(401, 'ACCESS_TOKEN_INVALID', 'Invalid access token');
  }
}
