import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { SquadBuilderComponent } from './features/squad-builder/squad-builder.component';

@Component({
  selector: 'lf-root',
  imports: [DashboardComponent, SquadBuilderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly activeView = signal<'team' | 'dashboard'>('team');
}
