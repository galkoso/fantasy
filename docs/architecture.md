# Architecture

## Compiler versions

Node and shared packages compile with the explicit `typescript-7` 7.0.2 binary.
The Angular application and ESLint parser use TypeScript 6.0.3 because Angular 22.1 officially
requires TypeScript `>=6.0 <6.1`.

## Flow

The official Israeli FA website is accessed only from the backend, behind `FootballDataProvider`.
`IsraeliFaProvider` fetches Ligat Winner pages, parsers emit normalized DTOs, and `SquadSyncService`
upserts them into MongoDB. Angular reads REST data from MongoDB and never calls football.org.il.

```text
football.org.il → IsraeliFaProvider → parsers → MongoDB → REST API → Angular /football/squads
```

## Collections

| Collection | Single responsibility | Important index |
| --- | --- | --- |
| `teams` | Ligat Winner clubs | unique partial `providerIds.israeliFa`, `active` |
| `players` | squad members | unique partial `providerIds.israeliFa`, `teamId`, `active`, `position`, `name` |

Application `_id` values are MongoDB ObjectIds. Israeli FA `team_id` / `player_id` values stay under
`providerIds.israeliFa`. Repeated syncs are bulk upserts. Players missing from a successful squad
fetch are marked `active: false` instead of being deleted. Empty or implausibly small scrapes abort
without mass deactivation.

## Synchronization

`SquadSyncService.syncIsraeliPremierLeagueSquads()` runs at API startup and daily at
`SQUAD_SYNC_HOUR_UTC` (default 02:00 UTC). Admins can also trigger it with
`POST /api/admin/football/sync-squads`. One failed team squad request does not abort the rest of the
run. League discovery failure aborts the run.
