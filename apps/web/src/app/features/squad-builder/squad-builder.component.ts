import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { PlayerPosition, PlayerSummary } from '@ligat-fantasy/contracts';
import { DEMO_PLAYERS } from '../../core/demo-players';
import { FantasyApiService } from '../../core/fantasy-api.service';
import { PlayerCardComponent } from '../../shared/player-card/player-card.component';

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
  readonly budget = computed(() => 1_000 - this.selected().reduce((sum, player) => sum + player.price, 0));
  readonly filtered = computed(() => {
    const term = this.search().toLowerCase();
    return this.available().filter((player) => !this.selected().some(({ id }) => id === player.id) &&
      (this.position() === 'ALL' || player.position === this.position()) && player.name.toLowerCase().includes(term));
  });
  readonly positions = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'] as const;

  constructor() { this.api.players().subscribe((players) => { if (players.length) this.available.set(players); }); }

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
}
