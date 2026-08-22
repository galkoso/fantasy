import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { FootballPlayerSummary, FootballTeamSummary, SquadPosition } from '@ligat-fantasy/contracts';
import { CurrentUserService } from '../../core/current-user.service';
import { IsraeliFaService } from '../../core/israeli-fa.service';
import { POSITION_FILTERS, filterSquad, formatSyncResult, positionLabel } from './squad-filter';

@Component({
  selector: 'lf-squads',
  templateUrl: './squads.component.html',
  styleUrl: './squads.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SquadsComponent {
  private readonly israeliFa = inject(IsraeliFaService);
  private readonly currentUser = inject(CurrentUserService);

  readonly teams = signal<FootballTeamSummary[]>([]);
  readonly squad = signal<FootballPlayerSummary[]>([]);
  readonly selectedTeamId = signal<string | null>(null);
  readonly search = signal('');
  readonly position = signal<'All' | SquadPosition>('All');
  readonly positions = POSITION_FILTERS;
  readonly loadingTeams = signal(true);
  readonly loadingPlayers = signal(false);
  readonly syncing = signal(false);
  readonly isAdmin = signal(false);
  readonly teamsError = signal<string | null>(null);
  readonly playersError = signal<string | null>(null);
  readonly syncMessage = signal<string | null>(null);
  readonly positionLabel = positionLabel;

  readonly selectedTeam = computed(() => this.teams().find((team) => team.id === this.selectedTeamId()));
  readonly players = computed(() => filterSquad(this.squad(), { search: this.search(), position: this.position() }));

  constructor() {
    this.currentUser.getCurrentUser().subscribe({
      next: (user) => this.isAdmin.set(user.isAdmin),
      error: () => this.isAdmin.set(false),
    });
    this.loadTeams();
  }

  selectTeam(teamId: string): void {
    this.selectedTeamId.set(teamId);
    this.loadSquad(teamId);
  }

  setPosition(position: 'All' | SquadPosition): void {
    this.position.set(position);
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  refreshSquads(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.syncMessage.set(null);
    this.israeliFa.syncSquads().subscribe({
      next: (result) => {
        this.syncing.set(false);
        this.syncMessage.set(formatSyncResult(result));
        this.loadTeams();
      },
      error: () => {
        this.syncing.set(false);
        this.syncMessage.set('Squad refresh failed.');
      },
    });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }

  private loadTeams(): void {
    this.loadingTeams.set(true);
    this.teamsError.set(null);
    this.israeliFa.getTeams().subscribe({
      next: (teams) => {
        this.teams.set(teams);
        this.loadingTeams.set(false);
        const selected = this.selectedTeamId() ?? teams[0]?.id;
        if (selected) {
          this.selectedTeamId.set(selected);
          this.loadSquad(selected);
        }
      },
      error: () => {
        this.loadingTeams.set(false);
        this.teamsError.set('Could not load Ligat Winner teams.');
      },
    });
  }

  private loadSquad(teamId: string): void {
    this.loadingPlayers.set(true);
    this.playersError.set(null);
    this.israeliFa.getPlayersByTeam(teamId).subscribe({
      next: (players) => { this.squad.set(players); this.loadingPlayers.set(false); },
      error: () => { this.playersError.set('Could not load this squad.'); this.loadingPlayers.set(false); },
    });
  }
}
