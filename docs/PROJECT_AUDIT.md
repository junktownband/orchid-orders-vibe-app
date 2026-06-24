# Project Audit

Дата аудита: 2026-06-01

## Stack

- Monorepo: `pnpm` workspaces.
- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide icons, TanStack Query provider.
- Backend: Fastify 5, TypeScript, Zod validation, JWT access tokens, httpOnly refresh cookie.
- Database: PostgreSQL, Prisma 6, local-first source of truth.
- Shared contracts: `packages/shared` exports Zod schemas and inferred TypeScript types.
- Tests: Vitest, React Testing Library, API module tests.
- Process management: PM2 via `ecosystem.config.cjs`.

## Architecture

- `apps/web` contains the Vite React app. Current navigation is in-memory screen state inside `src/app/App.tsx`; there is no browser-router layer yet.
- `apps/api` contains Fastify modules by domain: auth, repair orders, service catalog, expenses, analytics, health.
- `packages/db` contains Prisma schema, migrations, seed data, and the Prisma client wrapper.
- `packages/shared` contains API schemas, error constants, and role types used by both web and API.
- PostgreSQL is the only application datastore. Google Sheets, Forms, Drive, Excel, CSV, and Apps Script are explicitly outside runtime architecture.

## Key User Flows

- Auth: login by email/password, refresh via `orchid_refresh` httpOnly cookie, logout clears refresh cookie.
- Dashboard: current-month cash, paid revenue, gross profit, payable master commissions, resale margin, and repair status distribution.
- Repair orders: create order with customer, instrument, assignee, and line items; list recent orders; open order card; edit items before issue; change assignee/status; mark paid; issue and lock order.
- Service catalog: create fixed services used as quick order line templates.
- Expenses: create draft expenses, optionally linked to an order or order item; confirm expenses for cash analytics.
- Analytics: backend-calculated dashboard values; paid revenue is based on non-voided accepted payment records inside the period.

## Current UI Problems

- The previous visual style leaned heavily on large glass panels, decorative radial highlights, oversized radii, and hero-scale headings.
- Bottom navigation used only icons visually, which reduced scanability for a business tool.
- Focus states existed but were tied to generic focus styles instead of `focus-visible`.
- Forms did not consistently provide `name` and default `autocomplete` behavior.
- Dense operational values were not consistently using tabular number rendering.

## Current UX Problems

- Screen state is not represented in the URL, so orders/settings states are not deep-linkable.
- Most API failures surface as generic text; error messages do not expose actionable backend details.
- The issue flow is intentionally explicit, but other irreversible actions should keep confirmation or undo patterns as the product grows.
- Lists are capped server-side and do not yet expose search, pagination, or saved filters.
- Role permissions are enforced by API; UI affordances are not yet fully role-aware.

## Current Design System Problems

- Tailwind tokens existed, but component states and usage rules were undocumented.
- Radius, panel treatment, focus states, and motion were inconsistent across custom buttons/cards.
- Several one-off decorative treatments made the app feel less like a repeat-use workshop operations tool.

## Documentation Gaps

- `docs/API.md` had outdated request examples for repair order items and service catalog item type.
- There was no project audit, product roadmap, design-system note, or frontend UX implementation guide.
- `.env.example` did not include the Vite-facing `VITE_API_URL` variable used by the web app.

## Risks

- `apps/web/src/app/App.tsx` is large and combines routing, API calls, screens, and UI primitives. It is workable now, but future feature work should split it by domain.
- Order number generation is protected by retry-safe creation and should keep its unique constraint/migration coverage before deploy.
- Analytics uses UTC month boundaries; organization timezone exists in the database and should be applied before production reporting decisions.
- API docs and shared Zod schemas must stay synchronized because the frontend relies on schema-inferred types.

## Changes Made In This Pass

- Reworked visual foundation toward a restrained operational SaaS style: compact panels, smaller radii, calmer background, clearer nav labels.
- Added safer interaction states: `focus-visible`, reduced motion handling, tabular numeric display, button `type` defaults, and form field `name`/`autocomplete` defaults.
- Updated documentation with audit, roadmap, design-system notes, and corrected API examples.
- Added `VITE_API_URL` to `.env.example`.
