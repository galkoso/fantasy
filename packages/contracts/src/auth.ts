export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterUserRequest extends AuthCredentials {
  displayName: string;
}

export interface AuthSuccess {
  success: true;
  accessToken: string;
  user: AuthUser;
}

export interface AuthSession {
  success: true;
  user: AuthUser;
}
