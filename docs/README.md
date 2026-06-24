# Orchid Control Documentation

`docs` is the single documentation home for this repository. The previous `vault` tree is consolidated here; do not create a new `vault`.

## Read First

- [Codex Context Guide](CODEX_CONTEXT.md) - how to keep future development token-efficient.
- [Project Audit](PROJECT_AUDIT.md) - current state and risks.
- [Roadmap](ROADMAP.md) - product direction.
- [Changelog](CHANGELOG.md) - notable changes.

## Canonical Product And Domain

- [Product Vision](01-Product/01_PRODUCT_VISION.md)
- [User Stories](01-Product/02_USER_STORIES.md)
- [Non-goals](01-Product/03_NON_GOALS.md)
- [Domain Model](02-Domain/01_DOMAIN_MODEL.md)
- [Business Rules](02-Domain/02_BUSINESS_RULES.md)
- [Domain Map](02-Domain/03_DOMAIN_MAP.md)
- [Business Processes](02-Domain/04_BUSINESS_PROCESSES.md)

## Canonical Engineering Docs

- [API Contract](API.md)
- [Design System Notes](DESIGN_SYSTEM.md)
- [Deployment Notes](DEPLOYMENT.md)
- [Monorepo Architecture](03-Architecture/01_MONOREPO_ARCHITECTURE.md)
- [Backend Architecture](03-Architecture/02_BACKEND_ARCHITECTURE.md)
- [Frontend Architecture](03-Architecture/03_FRONTEND_ARCHITECTURE.md)
- [Package Scripts](03-Architecture/04_PACKAGE_SCRIPTS.md)
- [Definition of Done](10-Delivery/01_DEFINITION_OF_DONE.md)

## Area Indexes In Code

- Web shell: `apps/web/src/app/README.md`
- Web features: `apps/web/src/features/README.md`
- Orders feature: `apps/web/src/features/orders/README.md`
- API modules: `apps/api/src/modules/README.md`
- Repair orders API: `apps/api/src/modules/repair-orders/README.md`
- Shared schemas: `packages/shared/src/schemas/README.md`
- Prisma area: `packages/db/prisma/README.md`

## Reference And Draft Docs

- [Prisma Schema Draft](04-Database/01_PRISMA_SCHEMA_DRAFT.md)
- [Seed Data](04-Database/02_SEED_DATA.md)
- [Legacy API Contract Notes](05-API/01_API_CONTRACT.md)
- [Validation & Errors](05-API/02_VALIDATION_AND_ERRORS.md)
- [Frontend Design System Draft](06-Frontend-UX/01_DESIGN_SYSTEM.md)
- [Screens](06-Frontend-UX/02_SCREENS.md)
- [Forms Spec](06-Frontend-UX/03_FORMS_SPEC.md)
- [Analytics Spec](07-Analytics/01_ANALYTICS_SPEC.md)
- [Auth & RBAC](08-Security-RBAC/01_AUTH_RBAC.md)

## Task Archive

- [Run Order](09-Codex-Tasks/00_RUN_ORDER.md)
- Stage files live in [09-Codex-Tasks](09-Codex-Tasks/). They are implementation history, not the first place to read for new work.

## Source-Of-Truth Rules

- Backend owns business logic, validation, RBAC, money calculations, and status transitions.
- Frontend owns UX and presentation; it must not redefine business rules.
- API contracts must be reflected in `packages/shared/src/schemas/api.ts`.
- `docs/API.md` explains semantic contract decisions; it should not duplicate every Zod field.
