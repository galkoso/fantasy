# API-Football integration

`ApiFootballProvider` is the only module that knows API-Football transport shapes. It maps provider
responses to internal football records before persistence. Set `API_FOOTBALL_KEY`, league ID, and
season in the environment. Empty keys disable polling safely for local UI/domain development.

Live fixtures and player statistics have separate configurable intervals. Provider payloads may be
retained in operational logs, but are not the primary MongoDB domain documents.

At startup the worker imports the season's clubs, players, fixtures, and round-derived Gameweeks.
Live polling then requests only the current date. Transport retries throttling and server failures
with bounded exponential backoff. Provider club, player, and fixture IDs remain under
`providerIds.apiFootball`; application relationships use internal IDs.
