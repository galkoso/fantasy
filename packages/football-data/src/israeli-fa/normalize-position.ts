import type { SquadPosition } from '@ligat-fantasy/contracts';

const mappings: Array<{ pattern: RegExp; position: SquadPosition }> = [
  { pattern: /שוער|goalkeeper|^gk$/i, position: 'GOALKEEPER' },
  { pattern: /הגנה|מגן|בלם|defender|^df$/i, position: 'DEFENDER' },
  { pattern: /קשר|midfielder|^mf$/i, position: 'MIDFIELDER' },
  { pattern: /חלוץ|התקפה|attacker|forward|^fw$/i, position: 'ATTACKER' },
];

export function normalizePosition(raw: string | undefined): SquadPosition | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (value === 'GOALKEEPER' || value === 'DEFENDER' || value === 'MIDFIELDER' || value === 'ATTACKER') {
    return value;
  }
  return mappings.find(({ pattern }) => pattern.test(value))?.position;
}

export function ageFromBirthDate(birthDate: string, now = new Date()): number | undefined {
  const parsed = parseBirthDate(birthDate);
  if (!parsed) return undefined;
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - parsed.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < parsed.getUTCDate())) age -= 1;
  return age >= 14 && age <= 55 ? age : undefined;
}

export function parseBirthDate(value: string): Date | undefined {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
  const il = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (il) return new Date(`${il[3]}-${il[2]!.padStart(2, '0')}-${il[1]!.padStart(2, '0')}T00:00:00Z`);
  const monthYear = /^(\d{1,2})\/(\d{4})$/.exec(value);
  if (monthYear) return new Date(`${monthYear[2]}-${monthYear[1]!.padStart(2, '0')}-01T00:00:00Z`);
  return undefined;
}
