# Fantasy rules

Prices are integer tenths of a million. The authoritative season configuration starts teams at
1,000 units, requires a 2/5/5/3 squad, permits three players per club, and validates legal XI
formations.

Implemented and tested: appearance, goals by position, provider assists, clean sheets, goals
conceded while on pitch, saves, provider penalty saves/misses, cards, own goals, selling price,
transfer hits, squad composition, formation, captain fallback, and ordered automatic substitutes.

Rating bonus is behind a strategy interface and disabled by default. Exact FPL BPS and defensive
contributions are intentionally unsupported because the required event-level data is not reliably
available. No statistics are inferred.

Gameweek scoring uses immutable snapshots, never the current squad. The worker boundary supports
central polling; production scheduling and quota policy are configured through environment values.
