# Changelog

## Unreleased

- Added project audit, roadmap, and design system documentation.
- Updated API documentation to match shared Zod contracts for repair order items and service catalog creation.
- Added `VITE_API_URL` to `.env.example`.
- Refined the web UI foundation with calmer panels, smaller radii, clearer navigation labels, `focus-visible` states, reduced-motion handling, and safer form/button defaults.
- Consolidated the previous `vault` documentation tree into `docs` and added `docs/README.md` as the documentation index.
- Allowed both `localhost:5173` and `127.0.0.1:5173` as development CORS origins for the API.
- Added URL-backed web navigation for main sections, order detail/issue pages, and order list query filters.
- Added cursor pagination, backend order search, backend order sorting by status group, and `GET /repair-orders/:id`.
- Added PostgreSQL `pg_trgm` indexes for order search fields.
- Added optional customer phone capture with masked input, normalized phone search storage, and a non-destructive Prisma migration.
- Extended API error responses with field-level `errors` and surfaced validation errors in the order creation form.
- Switched the web dev default to same-origin `/api` proxy and added a tab-scoped session fallback so reload/direct links stay usable in the in-app browser.
- Replaced the expense order dropdown with order search plus an explicit general-expense checkbox; order-card expense creation still pre-fills whole-order and item-level context.
- Normalized repair order numbers away from the old `R-` prefix while keeping search compatible with legacy input formats.
- Added organization tax settings for self-employed mode, issue-time tax subject selection, tax snapshots, and automatic confirmed `TAX` expenses.
- Made `TAX` a system-only expense kind rejected by manual expense creation.
- Added service-line master assignment and issue-time commission snapshots calculated only from clean `SERVICE` line profit.
- Changed service-line commission base to subtract the line's proportional order-tax share before applying the master percent.
- Recalculate unpaid issued-order service commissions when a confirmed regular item expense is added after issue.
- Added a master commission register with `UNPAID/PAID` payout status and admin/owner mark-paid action.
- Changed master commission register totals to aggregate all commissions, not only the first visible page, and count paid commission KPI by `commissionPaidAt`.
- Added organization-scoped audit API and `Настройки -> Журнал` UI for key order, expense, and catalog events.
- Added audit logging and overwrite protection for master commission payout marks.
- Added `Настройки -> Мастера` with owner/admin master creation, profile editing, soft deactivation, and commission percent management.
- Added order-card audit timeline backed by `GET /api/v1/repair-orders/:id/audit`.
- Finalized the current customer history model and added customer profile editing from the order card with audit-backed before/after history.
- Added audit logging for organization tax setting changes.
- Added audit logging for payment method and expense category creation/update/deactivation.
- Added service catalog editing/deactivation with before/after audit entries.
- Added confirmed bulk master payouts, retry-safe order number allocation, and route-level smoke coverage for core order/payment/issue/expense/catalog flows.
- Changed default database seed to production-safe baseline users/settings/reference data, with demo orders available only through `db:seed:demo`.
- Kept order reads transparent for every active role while allowing `MASTER` users to change only working repair statuses (`IN_PROGRESS`/`READY`).

- Hardened auth recovery so stale stored sessions are validated before reuse, and invalid JWTs return `401` instead of surfacing as internal API errors.
- Split the web SPA shell into feature folders, extracted shared UI/app helpers, and added code-area README files to reduce future Codex context.
- Extracted repair-order commission math and order search normalization into focused backend helper modules.
- Split shared API Zod contracts into domain schema modules while keeping `schemas/api.ts` as the stable public barrel.
- Added `.codexignore` and a token-efficient context guide for future development.
- Added system `SALARY` expenses created from paid master commissions, removed receivables from the dashboard contract, and limited `MASTER` users to the orders area.
- Added focused finance/RBAC/API tests, representative dev seed data, and refreshed roadmap/seed documentation for the current business process.
- Made tax mode changes owner-only, added confirmations for payment/expense/payout financial actions, explained net cash in the dashboard, and hid back-office finance figures from master-facing order views.
- Restored fixed-service default cost in the settings UI, copied it into order items, and clarified that extra item-level expenses remain available for exceptional costs.
- Turned payouts into a focused working register with API filters for master, payout status, and accrual period plus grouped master totals.
- Replaced payout commission cards with a table-style register for easier comparison and bulk payout work.
- Added URL-backed filters for the settings audit journal by entity type and action.
- Added compact/card modes for the order list and split the order detail screen into focused panel components.
- Added payment methods and expense categories as configurable settings used by payments and expenses.
- Added explicit order prepayments with payment history and automatic remainder payment at issue time.
- Removed manual final-amount input from order issue; issue now uses the current item-based order total.
- Removed `OVERPAID` from the active payment-status domain and reject payments above the current order balance.
- Added a canonical business process document covering orders, prepayments, tax, expenses, commissions, payouts, analytics, and roles.
- Split web feature pages into lazy-loaded Vite chunks so the initial application bundle stays under the 500 KB warning threshold.

## 0.1.0 - Bootstrap

- Created pnpm monorepo with `apps/api`, `apps/web`, `packages/db`, `packages/shared`, and `packages/config`.
- Added Fastify API skeleton with `/health`.
- Added React/Vite starter screen for Orchid Control.
- Added local PostgreSQL environment example.
- Added PM2 ecosystem and scripts for running API and web without Docker.
- Added Prisma schema and seed script for the local PostgreSQL source of truth.
- Added auth API skeleton with login, refresh, logout, me, JWT access tokens, and httpOnly refresh cookies.
- Changed seed to create only user accounts plus the minimal organization memberships required for RBAC.
- Removed separate payment action from the initial UX direction; paid money will be driven by repair order status transitions.
- Added repair order API for listing, creating, and marking orders as paid.
- Connected the Repairs screen to real API data and creation flow.
- Added dashboard analytics API and connected the main screen to backend KPI.
- Added order line items for services, materials, and strings with per-order price and cost overrides.
- Added service catalog API/UI, responsible master assignment, and `paidBy` tracking when an order is marked paid.
- Added expenses API/UI with optional links to repair orders and concrete order items.
- Reworked the web UI into separate list/create screens for orders, expenses, and service catalog management.
- Adjusted the visual direction to a darker grey glassmorphism theme and generalized resale positions beyond strings.
