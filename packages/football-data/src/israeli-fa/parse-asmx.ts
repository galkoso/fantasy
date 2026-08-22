import { load } from 'cheerio';
import type { ExternalTeam } from '../football-data-provider.js';
import { IFA_SELECTORS } from './selectors.js';
import { cleanText } from './html.js';

export function decodeAsmxHtmlData(xml: string): string {
  const match = /<HtmlData(?:\s[^>]*)?>([\s\S]*?)<\/HtmlData>/i.exec(xml);
  if (!match?.[1]) return '';
  return decodeXmlEntities(match[1].trim());
}

export function parseGamesTeams(
  html: string,
  context: { leagueExternalId: string; leagueName: string; seasonExternalId?: string; seasonName?: string },
): ExternalTeam[] {
  const $ = load(html);
  const teams = new Map<string, ExternalTeam>();
  $(IFA_SELECTORS.gamesRow).each((_, row) => {
    const node = $(row);
    const names = node.find(IFA_SELECTORS.gameTeamName).toArray().map((element) => cleanTeamName($(element).text()));
    addGameTeam(teams, node.attr('data-team1'), names[0], context);
    addGameTeam(teams, node.attr('data-team2'), names[1], context);
  });
  return [...teams.values()];
}

function addGameTeam(
  teams: Map<string, ExternalTeam>,
  externalId: string | undefined,
  name: string | undefined,
  context: { leagueExternalId: string; leagueName: string; seasonExternalId?: string; seasonName?: string },
): void {
  if (!externalId || !name || teams.has(externalId)) return;
  const team: ExternalTeam = {
    externalId, name, leagueExternalId: context.leagueExternalId, leagueName: context.leagueName,
  };
  if (context.seasonExternalId) team.seasonExternalId = context.seasonExternalId;
  if (context.seasonName) team.seasonName = context.seasonName;
  teams.set(externalId, team);
}

function cleanTeamName(value: string): string {
  return cleanText(value.replace(/\u00a0/g, ' ').replace(/\s*-\s*$/, ''));
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
