# AGENTS.md

Rules for Codex agents working in this repository.

## Core Rules

- Do not connect Google services.
- Do not build Google Sheets, Google Forms, Apps Script, Drive, Excel, or CSV as runtime data stores.
- PostgreSQL is the application data source of truth.
- Backend owns business logic, RBAC, money calculations, status transitions, and audit side effects.
- Frontend owns UX and presentation.
- Money is stored as integer cents.
- Organization scope is required for business data.
- Audit is required for financial and operationally important actions.
- Browser verification is expensive; use it only when the user asks for it or visual behavior cannot be verified otherwise.

## Token Budget Rules

- Start with `README.md`, `docs/README.md`, then the README for the touched area.
- Do not read `dist`, `node_modules`, generated assets, lockfiles, or full migration history unless the task specifically needs them.
- Prefer `rg --files` and targeted `rg` over opening large files.
- For frontend work, use `apps/web/src/features/*` entry points instead of reading the app shell.
- For backend work, read `routes.ts`, `service.ts`, and the specific helper/repository slice needed.
- Keep new files under 300 lines when practical; split before 500 lines.

## Agent Roles

### architecture-agent

Keeps module boundaries, dependencies, and monorepo structure clean.

### backend-agent

Works on Fastify modules, Prisma repositories, services, RBAC, and audit side effects.

### db-agent

Works on Prisma schema, migrations, seed data, and indexes.

### frontend-agent

Works on React feature folders, forms, UI components, and client data flow.

### ux-agent

Checks that UI remains simple, mobile-friendly, readable, and operational rather than decorative.

### qa-agent

Writes tests and verifies money logic, RBAC, analytics, and important user flows.

## Handoff Checklist

- Name the files changed.
- Mention tests/typecheck/build run.
- Mention docs updated or why docs were not needed.
- Mention any area intentionally not browser-tested.
