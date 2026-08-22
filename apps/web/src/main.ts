import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, type HttpInterceptorFn } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { USERS_BASE } from './app/core/api-base';
import { getStoredAccessToken, getStoredUserId } from './app/core/auth-session';

const authInterceptor: HttpInterceptorFn = (req, next) => {
  const headers: Record<string, string> = {};
  const token = getStoredAccessToken();
  const userId = getStoredUserId();
  if (token && req.url.startsWith(USERS_BASE)) headers['Authorization'] = `Bearer ${token}`;
  if (userId) headers['x-user-id'] = userId;
  return Object.keys(headers).length > 0 ? next(req.clone({ setHeaders: headers })) : next(req);
};

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor])), provideRouter(routes)],
}).catch(console.error);
