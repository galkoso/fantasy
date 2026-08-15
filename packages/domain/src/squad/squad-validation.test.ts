import { describe, expect, it } from 'vitest';
import { DomainError } from '../errors/domain-error.js';
import type { OwnedPlayer } from '../types.js';
import { validateSquad } from './squad-validation.js';

function validSquad(): OwnedPlayer[] {
  const positions = [
    ...Array(2).fill('GOALKEEPER'), ...Array(5).fill('DEFENDER'),
    ...Array(5).fill('MIDFIELDER'), ...Array(3).fill('FORWARD'),
  ] as OwnedPlayer['position'][];
  return positions.map((position, index) => ({
    id: `p${index}`, clubId: `c${index % 5}`, position, currentPrice: 50, purchasePrice: 50,
  }));
}

describe('squad validation', () => {
  it('accepts a valid squad', () => expect(() => validateSquad(validSquad(), 250)).not.toThrow());

  it('enforces the club maximum', () => {
    const squad = validSquad();
    squad[0]!.clubId = 'same'; squad[1]!.clubId = 'same';
    squad[2]!.clubId = 'same'; squad[3]!.clubId = 'same';
    expect(() => validateSquad(squad, 250)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: 'MAX_PLAYERS_FROM_CLUB' }),
    );
  });

  it('enforces available budget', () => {
    expect(() => validateSquad(validSquad(), -1)).toThrowError(
      expect.objectContaining<Partial<DomainError>>({ code: 'INSUFFICIENT_BUDGET' }),
    );
  });
});
