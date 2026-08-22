import { load, type CheerioAPI } from 'cheerio';
import type { ExternalTeam, ParsedLeaguePage } from '../football-data-provider.js';
import { IFA_SELECTORS, LIGAT_WINNER_NAME } from './selectors.js';
import { cleanText, parseLeagueName, parseSeasonName, queryParam } from './html.js';

const SKIP_TEAM_NAME = /^(פרטי קבוצה|team details|home|away|vs|–|-)?$/i;
const DEFAULT_GAMES_BOX = '10';
const DEFAULT_GAMES_ROUND = '1';

export function parseLeaguePage(html: string, leagueExternalId: string): ParsedLeaguePage {
  const $ = load(html);
  const heading = cleanText($(IFA_SELECTORS.heading).first().text());
  const seasonName = parseSeasonName(heading) || selectedSeasonLabel($);
  const leagueName = parseLeagueName(heading) || LIGAT_WINNER_NAME;
  const gamesBox = $(IFA_SELECTORS.gamesTable).first().attr('data-table-index') || DEFAULT_GAMES_BOX;
  const gamesRound = $(IFA_SELECTORS.gamesTable).first().attr('data-table-round') || DEFAULT_GAMES_ROUND;
  const roundIds = discoverRoundIds($, gamesRound);
  const seasonExternalId = discoverSeasonId($, seasonName);
  const teams = discoverTeams($, leagueExternalId, seasonExternalId, leagueName, seasonName);
  return {
    leagueExternalId, leagueName, seasonExternalId, seasonName: seasonName ?? '', teams, gamesBox, gamesRound, roundIds,
  };
}

function selectedSeasonValue($: CheerioAPI): string | undefined {
  return $(IFA_SELECTORS.seasonSelect).first().attr('value') || undefined;
}

function selectedSeasonLabel($: CheerioAPI): string | undefined {
  const text = cleanText($(IFA_SELECTORS.seasonSelect).first().text());
  return text || undefined;
}

function discoverSeasonId($: CheerioAPI, seasonName: string | undefined): string {
  const selected = selectedSeasonValue($);
  if (selected) return selected;
  const fromTeams = new Map<string, number>();
  $(IFA_SELECTORS.teamLinks).each((_, element) => {
    const id = queryParam($(element).attr('href') ?? '', IFA_SELECTORS.seasonIdQuery);
    if (id) fromTeams.set(id, (fromTeams.get(id) ?? 0) + 1);
  });
  const mostCommonTeamSeason = [...fromTeams.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  if (mostCommonTeamSeason) return mostCommonTeamSeason;

  const matched: string[] = [];
  const rest: string[] = [];
  $(IFA_SELECTORS.seasonLinks).each((_, element) => {
    const id = queryParam($(element).attr('href') ?? '', IFA_SELECTORS.seasonIdQuery);
    if (!id) return;
    const text = cleanText($(element).text());
    if (seasonName && seasonTextMatches(text, seasonName)) matched.push(id);
    else rest.push(id);
  });
  if (matched[0]) return matched[0];
  if (rest[0]) return rest[0];
  const numeric = [...fromTeams.keys()].map(Number).filter((value) => Number.isFinite(value));
  return numeric.length > 0 ? String(Math.max(...numeric)) : '';
}

function discoverTeams(
  $: CheerioAPI,
  leagueExternalId: string,
  seasonExternalId: string,
  leagueName: string,
  seasonName: string | undefined,
): ExternalTeam[] {
  const teams = new Map<string, ExternalTeam>();
  $(IFA_SELECTORS.teamLinks).each((_, element) => {
    const href = $(element).attr('href') ?? '';
    const externalId = queryParam(href, IFA_SELECTORS.teamIdQuery);
    if (!externalId || teams.has(externalId)) return;
    const name = teamName(
      cleanText($(element).text()),
      cleanText($(element).attr('title') ?? ''),
      cleanText($(element).find('img').attr('alt') ?? ''),
    );
    if (!name) return;
    const logo = nearbyLogo(
      $(element).find('img').attr('src'),
      $(element).closest('tr, li, div').find('img').first().attr('src'),
    );
    const team: ExternalTeam = { externalId, name, leagueExternalId, leagueName };
    if (seasonExternalId) team.seasonExternalId = seasonExternalId;
    if (seasonName) team.seasonName = seasonName;
    if (logo) team.logo = logo;
    teams.set(externalId, team);
  });
  return [...teams.values()];
}

function teamName(text: string, title: string, alt: string): string | undefined {
  const value = text || title || alt;
  if (!value || SKIP_TEAM_NAME.test(value) || /^\d+$/.test(value) || value.length < 2) return undefined;
  if (/מחזור|סבב|עונה|round|season/i.test(value) && value.length < 12) return undefined;
  return value;
}

function nearbyLogo(src: string | undefined, closestSrc: string | undefined): string | undefined {
  const value = src || closestSrc;
  if (!value || value.startsWith('data:')) return undefined;
  return value;
}

function discoverRoundIds($: CheerioAPI, fallbackRound: string): string[] {
  const ids = new Set<string>();
  $(IFA_SELECTORS.roundSelect).each((_, element) => {
    const value = $(element).attr('value');
    if (value) ids.add(value);
  });
  if (ids.size === 0) ids.add(fallbackRound);
  return [...ids];
}

function seasonTextMatches(text: string, seasonName: string): boolean {
  const compact = (value: string) => value.replace(/\s+/g, '');
  return compact(text).includes(compact(seasonName)) || compact(seasonName).startsWith(compact(text).slice(0, 7));
}
