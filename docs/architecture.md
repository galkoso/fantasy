# Architecture

## Compiler versions

Node and shared packages compile with the explicit `typescript-7` 7.0.2 binary.
The Angular application and ESLint parser use TypeScript 6.0.3 because Angular 22.1 officially
requires TypeScript `>=6.0 <6.1`.

## Flow

The official Israeli FA website is accessed only from `apps/israeliFaPooling`, behind `FootballDataProvider`.
`IsraeliFaProvider` fetches Ligat Winner pages, parsers emit normalized DTOs, and `SquadSyncService`
upserts them into MongoDB. The API and Angular's `IsraeliFaService` read REST data from MongoDB and never call football.org.il.

```text
football.org.il → israeliFaPooling → parsers → MongoDB → API REST → Angular /football/squads
```

## Collections

| Collection | Single responsibility | Important index |
| --- | --- | --- |
| `teams` | Ligat Winner clubs | unique partial `providerIds.israeliFa`, `active` |
| `players` | squad members | unique partial `providerIds.israeliFa`, `teamId`, `active`, `position`, `name` |
| `users` | signed-in people | unique `email` |

Application `_id` values are MongoDB ObjectIds. Israeli FA `team_id` / `player_id` values stay under
`providerIds.israeliFa`. Repeated syncs are bulk upserts. A player `name` that no longer matches
`providerName` (the last name from the FA) is treated as a manual edit and is not overwritten.
Players missing from a successful squad
fetch are marked `active: false` instead of being deleted. Empty or implausibly small scrapes abort
without mass deactivation.

## Users

`apps/users` owns sign-up, sign-in, and session. Angular stores the access token in `localStorage`
so closing Chrome and coming back keeps the user signed in until the token expires
(`JWT_ACCESS_EXPIRES_IN_SECONDS`, default 30 days). Other services identify the user with
`x-user-id` from that session.

## Synchronization

`IsraeliFaPoolingService.syncSquads()` runs at israeliFaPooling startup and daily at
`SQUAD_SYNC_HOUR_UTC` (default 02:00 UTC). Admins can also trigger it with
`POST http://localhost:3001/sync-squads`. One failed team squad request does not abort the rest of the
run. League discovery failure aborts the run.
