import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'lf-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {}
