# Israeli FA (football.org.il) integration

The backend talks to the public Israeli Football Association website. Club lists on the league page
are loaded by JavaScript; the same public ASMX GET the site uses is called directly. Squads are HTML.
Angular never requests football.org.il.

## Pages / endpoints used

| Data | URL |
| --- | --- |
| Current Ligat WINNER season | `https://www.football.org.il/leagues/league/?league_id=40` |
| Round fixtures / club ids | `/Components.asmx/LeagueGamesList?league_id={id}&season_id={id}&box={id}&round_id={id}` |
| Squad tab | `/team-details/?team_id={id}&season_id={id}&itemid={2AE09DED-5019-4C49-BFD5-4458C66F9D24}` |
| Player page (not fetched during sync) | `/players/player/?player_id={id}` |

`league_id=40` is the IFA Ligat WINNER competition id. The current `season_id` is the selected
`#season_choose` option (currently `28` for 2026/2027). Club ids come from fixture rows
(`data-team1` / `data-team2`), not from `team_id` links on the league shell page.

## HTTP client

`ISRAELI_FA_BASE_URL` (default `https://www.football.org.il`), `ISRAELI_FA_REQUEST_TIMEOUT_MS`, and
`ISRAELI_FA_REQUEST_DELAY_MS` control the dedicated client. Cloudflare hard-blocks Node.js `fetch`
and curl TLS fingerprints on HTML pages (`Sorry, you have been blocked`). Requests therefore go
through `impit` with Chrome TLS impersonation, plus timeouts, bounded retries, and throttling.
