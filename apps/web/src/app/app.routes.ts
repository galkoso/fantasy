import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { SquadsComponent } from './features/squads/squads.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'football/squads' },
  { path: 'football/squads', component: SquadsComponent, canActivate: [authGuard] },
  { path: 'players', redirectTo: 'football/squads' },
];
