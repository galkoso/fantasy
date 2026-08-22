import type { Routes } from '@angular/router';
import { SquadsComponent } from './features/squads/squads.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'football/squads' },
  { path: 'football/squads', component: SquadsComponent },
  { path: 'players', redirectTo: 'football/squads' },
];
