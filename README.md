# Orchid Control

Local-first B2B SaaS for repair workshop operations. The source of truth is local PostgreSQL accessed through Prisma. Google Sheets, Google Forms, Apps Script, Google Drive, Excel and CSV are not application data stores.

## Stack

- pnpm workspaces
- Fastify + TypeScript API
- Prisma + PostgreSQL
- React + Vite + TypeScript
- Tailwind CSS
- Zod shared schemas
- PM2 process manager

## Product Scope

Orchid Control is focused on repair workshop operations:

- repair order intake, assignment, status, payment marking, and issue;
- fixed service catalog for quick order lines;
- draft and confirmed expenses;
- current-month cash and margin analytics.

The business logic source of truth lives in PostgreSQL and the shared Zod/API contracts. UI changes should not rename roles, statuses, fields, or payment semantics without an explicit product decision.

## Local Start

Start PostgreSQL locally on port `5433`:

```bash
docker run --name orchid-control-postgres-5433 -e POSTGRES_USER=orchid -e POSTGRES_PASSWORD=orchid -e POSTGRES_DB=orchid_control -p 5433:5432 -v orchid_postgres_5433_data:/var/lib/postgresql/data -d postgres:16
```

```bash
corepack enable
corepack pnpm install
copy .env.example .env
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm pm2:start
```

API: `http://localhost:3005`

Web: `http://localhost:5173`

Health: `http://localhost:3005/health`

Seed user:

- email: `sasha@orchid.local`
- password: `orchid12345`

## Database

```bash
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm db:studio
```

## PM2

```bash
corepack pnpm pm2:start
corepack pnpm pm2:logs
corepack pnpm pm2:restart
corepack pnpm pm2:stop
```

## Development Docs

- Canonical documentation root: [docs](docs/README.md). Do not add a separate `vault` documentation tree.
- Token-efficient development map: [docs/CODEX_CONTEXT.md](docs/CODEX_CONTEXT.md).
- [Project audit](docs/PROJECT_AUDIT.md)
- [Production deploy runbook](DEPLOY.md)
- [API contract](docs/API.md)
- [Design system notes](docs/DESIGN_SYSTEM.md)
- [Roadmap](docs/ROADMAP.md)
- [Deployment notes](docs/DEPLOYMENT.md)
- [Changelog](docs/CHANGELOG.md)
