import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { PlayerPosition, PlayerSummary } from '@ligat-fantasy/contracts';
import { DEMO_PLAYERS } from '../../core/demo-players';
import { FantasyApiService } from '../../core/fantasy-api.service';
import { PlayerCardComponent } from '../../shared/player-card/player-card.component';
import { catchError, EMPTY, finalize, forkJoin, of, switchMap } from 'rxjs';

const required: Record<PlayerPosition, number> = { GOALKEEPER: 2, DEFENDER: 5, MIDFIELDER: 5, FORWARD: 3 };

@Component({
  selector: 'lf-squad-builder',
  imports: [DecimalPipe, PlayerCardComponent],
  templateUrl: './squad-builder.component.html',
  styleUrl: './squad-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SquadBuilderComponent {
  private readonly api = inject(FantasyApiService);
  readonly selected = signal<PlayerSummary[]>(DEMO_PLAYERS.slice(0, 15));
  readonly available = signal<PlayerSummary[]>(DEMO_PLAYERS);
  readonly position = signal<PlayerPosition | 'ALL'>('ALL');
  readonly search = signal('');
  readonly view = signal<'pitch' | 'list'>('pitch');
  readonly captainId = signal('demo-8');
  readonly viceCaptainId = signal('demo-9');
  readonly saving = signal(false);
  readonly feedback = signal('');
  readonly budget = computed(() => 1_000 - this.selected().reduce((sum, player) => sum + player.price, 0));
  readonly filtered = computed(() => {
    const term = this.search().toLowerCase();
    return this.available().filter((player) => !this.selected().some(({ id }) => id === player.id) &&
      (this.position() === 'ALL' || player.position === this.position()) && player.name.toLowerCase().includes(term));
  });
  readonly positions = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'] as const;

  constructor() {
    forkJoin({ players: this.api.players(), team: this.api.team() }).subscribe(({ players, team }) => {
      this.available.set(players);
      if (!team?.squad.length) return;
      const byId = new Map(players.map((player) => [player.id, player]));
      const owned = team.squad.flatMap(({ playerId }) => byId.get(playerId) ?? []);
      if (owned.length === team.squad.length) this.selected.set(owned);
      if (team.captainPlayerId) this.captainId.set(team.captainPlayerId);
      if (team.viceCaptainPlayerId) this.viceCaptainId.set(team.viceCaptainPlayerId);
    });
  }

  playersAt(position: PlayerPosition): PlayerSummary[] {
    return this.selected().filter((player) => player.position === position);
  }

  missingAt(position: PlayerPosition): number[] {
    return Array.from({ length: Math.max(0, required[position] - this.playersAt(position).length) }, (_, index) => index);
  }

  select(player: PlayerSummary): void {
    if (this.selected().length >= 15 || this.playersAt(player.position).length >= required[player.position]) return;
    if (player.price > this.budget()) return;
    if (this.selected().filter(({ clubId }) => clubId === player.clubId).length >= 3) return;
    this.selected.update((players) => [...players, player]);
  }

  remove(playerId: string): void { this.selected.update((players) => players.filter(({ id }) => id !== playerId)); }
  browsePosition(position: PlayerPosition): void { this.position.set(position); }
  setSearch(event: Event): void { this.search.set((event.target as HTMLInputElement).value); }
  setPosition(event: Event): void { this.position.set((event.target as HTMLSelectElement).value as PlayerPosition | 'ALL'); }

  save(): void {
    if (this.selected().length !== 15 || this.saving()) return;
    const starters = [...this.playersAt('GOALKEEPER').slice(0, 1), ...this.playersAt('DEFENDER').slice(0, 3),
      ...this.playersAt('MIDFIELDER').slice(0, 4), ...this.playersAt('FORWARD').slice(0, 3)];
    const starterIds = new Set(starters.map(({ id }) => id));
    const bench = this.selected().filter(({ id }) => !starterIds.has(id));
    const orderedBench = [...bench.filter(({ position }) => position === 'GOALKEEPER'),
      ...bench.filter(({ position }) => position !== 'GOALKEEPER')];
    const captain = starters.find(({ position }) => position === 'MIDFIELDER')!;
    const viceCaptain = starters.find(({ position }) => position === 'FORWARD')!;
    this.saving.set(true); this.feedback.set('');
    this.api.saveSquad("Gal's XI", this.selected().map(({ id }) => id)).pipe(
      switchMap(() => this.api.saveLineup(starters.map(({ id }) => id), orderedBench.map(({ id }) => id))),
      switchMap(() => this.api.saveCaptains(captain.id, viceCaptain.id)),
      switchMap(() => this.api.currentGameweek()),
      switchMap((gameweek) => gameweek ? this.api.submitGameweek(gameweek.id) : of(null)),
      catchError(() => { this.feedback.set('Could not save. Check the API connection and squad rules.'); return EMPTY; }),
      finalize(() => this.saving.set(false)),
    ).subscribe(() => { this.captainId.set(captain.id); this.viceCaptainId.set(viceCaptain.id);
      this.feedback.set('Squad, lineup, and captains saved.'); });
  }
}
