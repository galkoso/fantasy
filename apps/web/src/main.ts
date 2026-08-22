import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors, type HttpInterceptorFn } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

const userIdInterceptor: HttpInterceptorFn = (req, next) => {
  const userId = globalThis.localStorage?.getItem('userId') ?? 'local-demo-user';
  return next(req.clone({ setHeaders: { 'x-user-id': userId } }));
};

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([userIdInterceptor])), provideRouter(routes)],
}).catch(console.error);
