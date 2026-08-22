import { load, type CheerioAPI } from 'cheerio';
import type { ExternalPlayer } from '../football-data-provider.js';
import { ageFromBirthDate, normalizePosition } from './normalize-position.js';
import { STAFF_ROLE_PATTERN, IFA_SELECTORS } from './selectors.js';
import { cleanText, parseShirtNumber, queryParam } from './html.js';

type CheerioInput = Parameters<CheerioAPI>[0];

export function parseSquadPage(html: string): ExternalPlayer[] {
  const $ = load(html);
  const byId = new Map<string, ExternalPlayer>();
  const withoutId: ExternalPlayer[] = [];

  $(IFA_SELECTORS.playerLinks).each((_, element) => {
    const player = parsePlayerLink($, element);
    if (!player) return;
    if (player.externalId) byId.set(player.externalId, player);
    else withoutId.push(player);
  });

  $('tr').each((_, row) => {
    const player = parseTableRow($, row);
    if (!player) return;
    if (player.externalId) {
      const current = byId.get(player.externalId);
      byId.set(player.externalId, current ? mergePlayer(current, player) : player);
    } else if (!withoutId.some((item) => item.name === player.name)) {
      withoutId.push(player);
    }
  });

  if (byId.size === 0) {
    $(IFA_SELECTORS.listItems).each((_, item) => {
      const player = parseListItem($, item);
      if (!player) return;
      if (player.externalId) byId.set(player.externalId, player);
      else if (!withoutId.some((item) => item.name === player.name)) withoutId.push(player);
    });
  }

  const players = [...byId.values(), ...withoutId.filter((player) =>
    !player.externalId || !byId.has(player.externalId))];
  return uniquePlayers(players);
}

function parsePlayerLink($: CheerioAPI, element: CheerioInput): ExternalPlayer | undefined {
  const node = $(element);
  const href = node.attr('href') ?? '';
  const externalId = queryParam(href, IFA_SELECTORS.playerIdQuery);
  const raw = cleanText(node.text()) || cleanText(node.attr('title') ?? '') || cleanText(node.find('img').attr('alt') ?? '');
  const name = playerName(raw);
  if (!name || isStaff(raw)) return undefined;
  const photo = node.find('img').attr('src');
  const player: ExternalPlayer = { name };
  if (externalId) player.externalId = externalId;
  if (photo && !photo.startsWith('data:')) player.photo = photo;
  return player;
}

function parseTableRow($: CheerioAPI, row: CheerioInput): ExternalPlayer | undefined {
  const cells = $(row).find('td, th').toArray().map((cell) => cleanText($(cell).text()));
  const linkNode = $(row).find(IFA_SELECTORS.playerLinks).get(0);
  const fromLink = linkNode ? parsePlayerLink($, linkNode) : undefined;
  const combined = cleanText(cells.join(' '));
  if (isStaff(combined)) return undefined;
  const name = fromLink?.name ?? cells.map(playerName).find((value) => value && value.length > 2);
  if (!name) return undefined;
  const shirtNumber = cells.map(parseShirtNumber).find((value) => value !== undefined);
  const positionRaw = cells.find((cell) => normalizePosition(cell));
  const position = positionRaw ? normalizePosition(positionRaw) : undefined;
  const birthDate = cells.find((cell) => /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{4}/.test(cell));
  const photo = $(row).find('img').attr('src');
  const ageFromBirth = birthDate ? ageFromBirthDate(birthDate) : undefined;
  const ageCell = cells.map((cell) => Number(cell)).find((value) => value >= 15 && value <= 50);
  const player: ExternalPlayer = { name };
  if (fromLink?.externalId) player.externalId = fromLink.externalId;
  if (shirtNumber !== undefined) player.shirtNumber = shirtNumber;
  if (position) player.position = position;
  if (positionRaw && position) player.positionRaw = positionRaw;
  if (birthDate) player.birthDate = birthDate;
  if (ageFromBirth !== undefined) player.age = ageFromBirth;
  else if (ageCell !== undefined && !birthDate) player.age = ageCell;
  if (photo && !photo.startsWith('data:')) player.photo = photo;
  return player;
}

function parseListItem($: CheerioAPI, item: CheerioInput): ExternalPlayer | undefined {
  const node = $(item);
  const raw = cleanText(node.text());
  if (!raw || isStaff(raw)) return undefined;
  const linkNode = node.find(IFA_SELECTORS.playerLinks).get(0);
  if (linkNode) return parsePlayerLink($, linkNode);
  if (node.find('a').length > 0) return undefined;
  const name = playerName(raw);
  if (!name || name === raw && /[:|]/.test(raw)) return undefined;
  return { name };
}

function playerName(value: string): string | undefined {
  const withoutNumber = cleanText(value.replace(/^\d{1,2}\s+/, '').replace(/\s+\d{1,2}$/, ''));
  if (!withoutNumber || isStaff(withoutNumber) || SKIP_NAME.test(withoutNumber)) return undefined;
  return withoutNumber;
}

function isStaff(value: string): boolean {
  return STAFF_ROLE_PATTERN.test(value);
}

function mergePlayer(current: ExternalPlayer, extra: ExternalPlayer): ExternalPlayer {
  return { ...current, ...extra, name: current.name || extra.name };
}

function uniquePlayers(players: ExternalPlayer[]): ExternalPlayer[] {
  const seen = new Set<string>();
  return players.filter((player) => {
    const key = player.externalId ?? `name:${player.name}`;
    if (seen.has(key) || !player.name) return false;
    seen.add(key);
    return true;
  });
}

const SKIP_NAME = /^(סגל שחקנים|בעלי תפקידים|שם|עמדה|מספר|שחקן|players?|squad|staff)$/i;
