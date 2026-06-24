# Codex Context Guide

Goal: reduce token spend during development by reading narrow entry points.

## Default Reading Order

1. `README.md`
2. `docs/README.md`
3. The README of the area being changed
4. The exact route/service/page/helper file for the task

## Avoid By Default

- `node_modules/`
- `dist/`
- `coverage/`
- `pnpm-lock.yaml`
- generated Vite assets
- full migration history unless the task is about migrations
- browser verification unless explicitly requested

## Frontend Entry Points

- Shell/routing/auth session: `apps/web/src/app/`
- Orders: `apps/web/src/features/orders/`
- Expenses: `apps/web/src/features/expenses/`
- Analytics: `apps/web/src/features/analytics/`
- Settings: `apps/web/src/features/settings/`

## Backend Entry Points

- Module map: `apps/api/src/modules/README.md`
- Repair orders: `apps/api/src/modules/repair-orders/README.md`
- Shared API schemas: `packages/shared/src/schemas/README.md`
- Prisma: `packages/db/prisma/README.md`

## File Size Rule

Prefer files under 300 lines. If a file goes past 500 lines, split helpers, page sections, or pure calculations before adding more behavior.
