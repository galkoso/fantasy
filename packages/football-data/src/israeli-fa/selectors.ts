/** Stable query keys and CMS tab ids observed on football.org.il. */
export const IFA_SELECTORS = {
  teamIdQuery: 'team_id',
  seasonIdQuery: 'season_id',
  leagueIdQuery: 'league_id',
  playerIdQuery: 'player_id',
  squadTabItemId: '{2AE09DED-5019-4C49-BFD5-4458C66F9D24}',
  staffTabItemId: '{D9E76668-5F1A-4149-AB0F-BA59A233C363}',
  heading: 'h1',
  teamLinks: 'a[href*="team_id="]',
  seasonLinks: 'a[href*="season_id="]',
  seasonSelect: '#season_choose option[selected]',
  gamesTable: '.league-game-table, [data-table-type="games"]',
  gamesRow: '[data-team1][data-team2]',
  gameTeamName: '.team-name-text',
  roundSelect: '#ddlRounds option',
  playerLinks: 'a[href*="player_id="]',
  listItems: 'li',
  images: 'img',
} as const;

export const STAFF_ROLE_PATTERN = /מאמן|רופא|הנהלה|מזכיר|פיזיותרפיסט|קצין|מנכ|חובש|אנליסט|כרוז|משק|דובר|TMS|נגישות|מנהל הקבוצה|מנהל מקצועי|עוזר מאמן|מאמן כושר|מאמן שוערים|חבר הנהלה|בעל זכות|איש קשר/;

export const LIGAT_WINNER_LEAGUE_ID = '40';
export const LIGAT_WINNER_NAME = 'ליגת WINNER';
