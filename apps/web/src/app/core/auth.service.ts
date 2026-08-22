import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthSession, AuthSuccess, AuthUser } from '@ligat-fantasy/contracts';
import { catchError, map, tap, throwError, type Observable } from 'rxjs';
import { authLoginUrl, authLogoutUrl, authRegisterUrl, authSessionUrl } from './auth.paths';
import { clearAuthSession, getStoredAccessToken, persistAuthSession, readStoredUser } from './auth-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly user = signal<AuthUser | null>(readStoredUser());

  constructor() {
    this.validateStoredSession();
  }

  isLoggedIn(): boolean {
    return getStoredAccessToken() !== null;
  }

  register(displayName: string, email: string, password: string): Observable<AuthUser> {
    return this.persistResponse(this.http.post<AuthSuccess>(authRegisterUrl(), { displayName, email, password }));
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.persistResponse(this.http.post<AuthSuccess>(authLoginUrl(), { email, password }));
  }

  logout(): void {
    this.http.post(authLogoutUrl(), {}).subscribe({ error: () => undefined });
    clearAuthSession();
    this.user.set(null);
  }

  private persistResponse(request: Observable<AuthSuccess>): Observable<AuthUser> {
    return request.pipe(
      tap((response) => {
        persistAuthSession(response.accessToken, response.user);
        this.user.set(response.user);
      }),
      map((response) => response.user),
      catchError((error: unknown) => throwError(() => new Error(authErrorMessage(error)))),
    );
  }

  private validateStoredSession(): void {
    const token = getStoredAccessToken();
    if (!token) {
      this.logoutLocal();
      return;
    }
    this.http.get<AuthSession>(authSessionUrl()).subscribe({
      next: (session) => {
        persistAuthSession(token, session.user);
        this.user.set(session.user);
      },
      error: () => {
        this.logoutLocal();
        void this.router.navigateByUrl('/login');
      },
    });
  }

  private logoutLocal(): void {
    if (!getStoredAccessToken() && !this.user()) return;
    clearAuthSession();
    this.user.set(null);
  }
}

function authErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
    if (error.status === 0) return 'Server connection failed';
  }
  return 'Sign in failed';
}
