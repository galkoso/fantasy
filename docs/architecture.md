# Architecture

## Reference constraint

The requested Zapp monorepo was not present in the provided workspace when this project was
created. The repository was empty. The implementation therefore applies the described Zapp
principles—small modules, explicit boundaries, shared configuration, focused repositories,
and independently runnable apps—without claiming parity with unavailable source conventions.

## Flow

API-Football is accessed only through `FootballDataProvider`. The worker normalizes responses
into clubs, players, fixtures, and player match statistics. Pure scoring consumes normalized
statistics and persists a separate point breakdown. Fastify reads internal data and publishes
gameweek changes through SSE; browsers never poll the provider.

## Data ownership

- Provider data: external IDs and normalized match facts.
- Fantasy data: prices, rules, points, gameweeks, snapshots, and rankings.
- User data: account, current team, transfers, and league membership.

Application IDs are independent from provider IDs. Repeated syncs are upserts and finalization
is guarded by state, making worker operations retry-safe.

## Collections

| Collection | Single responsibility | Important index |
| --- | --- | --- |
| `users` | identity and account data | unique email |
| `clubs` | internal club records | unique provider ID |
| `players` | current fantasy player catalog | club, position |
| `fixtures` | normalized matches | gameweek/status/kickoff |
| `player_match_stats` | normalized player facts per fixture | unique fixture + player |
| `player_match_points` | calculated fantasy breakdown | unique fixture + player |
| `gameweeks` | deadlines and lifecycle | unique season + number |
| `fantasy_teams` | current squad, bank, and team state | unique user |
| `gameweek_team_snapshots` | immutable submitted lineup | unique gameweek + team |
| `gameweek_user_scores` | provisional/final gameweek result | unique gameweek + team |
| `transfers` | permanent transfer audit | team + created time |
| `player_price_history` | historical price changes | player + effective time |
| `fantasy_leagues` | private league metadata | unique join code |
| `fantasy_league_members` | league membership/ranking | unique league + team |

Embedding the 15 current memberships in `fantasy_teams` makes atomic squad replacement and
the primary read cheap. Historical ownership belongs in snapshots and transfers.

## Concurrency

Transfers use a MongoDB transaction and optimistic `version` match. Point writes are upserts.
Gameweek snapshot creation uses a unique index, so retries cannot create duplicate submissions.

## Phasing

This baseline implements the Phase 1 vertical slice and domain-ready foundations. Authentication
is represented by a local development user header until an identity provider is selected.
Price automation and chips remain isolated Phase 2 capabilities rather than incomplete behavior.
