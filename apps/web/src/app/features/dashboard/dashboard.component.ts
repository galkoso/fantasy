import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { DashboardDto, LiveEvent } from '@ligat-fantasy/contracts';
import { retry } from 'rxjs';
import { FantasyApiService } from '../../core/fantasy-api.service';

@Component({
  selector: 'lf-dashboard',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly api = inject(FantasyApiService);
  readonly dashboard = signal<DashboardDto | null>(null);
  readonly livePoints = signal<number | null>(null);
  readonly points = computed(() => this.livePoints() ?? this.dashboard()?.gameweekPoints ?? 0);
  readonly teamValue = computed(() => {
    const team = this.dashboard()?.team;
    return team ? team.bank + team.squad.reduce((sum, player) => sum + player.purchasePrice, 0) : 0;
  });

  constructor() {
    this.api.dashboard().subscribe((dashboard) => this.dashboard.set(dashboard));
    this.api.liveEvents().pipe(retry({ delay: 3_000 })).subscribe((event) => this.applyLiveEvent(event));
  }

  private applyLiveEvent(event: LiveEvent): void {
    if (event.type !== 'GAMEWEEK_POINTS_UPDATED') return;
    const payload = event.payload as { fantasyTeamId?: string; points?: number };
    if (payload.fantasyTeamId === this.dashboard()?.team.id && payload.points !== undefined) {
      this.livePoints.set(payload.points);
    }
  }
}
