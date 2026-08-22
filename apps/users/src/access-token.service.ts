import { SignJWT, jwtVerify } from 'jose';

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export class AccessTokenService {
  private readonly secret: Uint8Array;

  constructor(
    secret: string,
    private readonly expiresInSeconds: number,
  ) {
    this.secret = new TextEncoder().encode(secret);
  }

  sign(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({ ...payload, tokenType: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(payload.userId)
      .setIssuedAt()
      .setExpirationTime(`${this.expiresInSeconds}s`)
      .sign(this.secret);
  }

  async verify(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    if (payload.tokenType !== 'access' || typeof payload.userId !== 'string' || typeof payload.email !== 'string') {
      throw new Error('ACCESS_TOKEN_INVALID');
    }
    return { userId: payload.userId, email: payload.email };
  }
}
