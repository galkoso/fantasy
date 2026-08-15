# Ligat Fantasy

An original Fantasy Football platform for Ligat Ha'Al, built as an Angular, Fastify,
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

To run only the web application (without requiring MongoDB, the API, or the worker):

```bash
pnpm dev:web
```

`pnpm build` only creates production files; it does not start a server.

## Workspace

- `apps/web`: responsive Angular client and squad builder
- `apps/api`: Fastify REST API and server-sent events
- `apps/worker`: centralized football polling process
- `packages/domain`: authoritative squad, lineup, transfer, and captain rules
- `packages/scoring`: pure deterministic player scoring
- `packages/contracts`: shared transport contracts
- `packages/config`: validated environment configuration
- `packages/database`: MongoDB connection and indexes

See [docs/architecture.md](docs/architecture.md) and [docs/fantasy-rules.md](docs/fantasy-rules.md).

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
