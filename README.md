# Ligat Fantasy

Israeli Premier League squads for Ligat Ha'Al, built as an Angular, Fastify,
MongoDB, TypeScript, pnpm, and Turborepo monorepo.

## Quick start

The repository pins Node.js 22.22.3 in `.npmrc`; pnpm provisions it automatically for scripts
because Angular 22 does not support Node 24 versions below 24.15. `nvm use` is optional for making
the interactive shell match the project runtime.

```bash
cp .env.example .env
pnpm install
pnpm dev
```

The API defaults to `http://localhost:3000` and the web application to
`http://localhost:4200`. MongoDB must be available at `MONGODB_URI`.

To run only the web application (without requiring MongoDB or the API):

```bash
pnpm dev:web
```

To load Ligat Winner squads into MongoDB after startup, sign in as an admin (`x-user-id` listed in
`ADMIN_USER_IDS`, default `local-demo-user`) and call `POST /api/admin/football/sync-squads`, or
open `/football/squads` and click **Refresh squads**.

## Workspace

- `apps/web`: Angular client for league teams and squads
- `apps/api`: Fastify REST API and squad synchronization
- `packages/football-data`: Israeli FA provider, parsers, and squad upserts
- `packages/contracts`: shared transport contracts
- `packages/config`: validated environment configuration
- `packages/database`: MongoDB connection, models, and indexes

See [docs/architecture.md](docs/architecture.md) and [docs/israeli-fa.md](docs/israeli-fa.md).

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
