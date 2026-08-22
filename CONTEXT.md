# Ligat Fantasy

Israeli Premier League fantasy football. Managers pick squads from Ligat Winner clubs.

## Language

**User**:
A person who signs in to Ligat Fantasy with an email and password.
_Avoid_: Account, manager (the fantasy squad owner is a later concept), client

**Access token**:
A credential the browser keeps after sign-in so the User is still signed in after closing Chrome.
_Avoid_: Cookie session, API key, x-user-id (that header only identifies an already authenticated User to other services)
