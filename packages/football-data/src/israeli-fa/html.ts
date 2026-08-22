import { LIGAT_WINNER_NAME, IFA_SELECTORS } from './selectors.js';

export function queryParam(href: string, key: string): string | undefined {
  try {
    const value = new URL(href, 'https://www.football.org.il').searchParams.get(key);
    return value && value.length > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export function absoluteUrl(href: string, baseUrl: string): string {
  return new URL(href, baseUrl).toString();
}

export function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function parseSeasonName(heading: string): string | undefined {
  const match = /(\d{4}\/\d{2,4})/.exec(heading);
  return match?.[1];
}

export function parseLeagueName(heading: string): string {
  if (heading.includes('ליגת WINNER') || heading.includes('Premier League')) return LIGAT_WINNER_NAME;
  const withoutSeason = heading.replace(/\d{4}\/\d{2,4}/, '');
  return cleanText(withoutSeason) || LIGAT_WINNER_NAME;
}

export function parseShirtNumber(value: string): number | undefined {
  const match = /^\s*(\d{1,2})\s*$/.exec(value);
  if (!match?.[1]) return undefined;
  const number = Number(match[1]);
  return number >= 0 && number <= 99 ? number : undefined;
}

export { IFA_SELECTORS };
