import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PlayerSummary } from '@ligat-fantasy/contracts';

@Component({
  selector: 'lf-player-card',
  imports: [DecimalPipe],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerCardComponent {
  readonly player = input.required<PlayerSummary>();
  readonly captain = input(false);
  readonly viceCaptain = input(false);
  readonly remove = output<string>();
}
