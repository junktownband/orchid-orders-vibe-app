# API Modules

Each module should keep the same shape:

- `routes.ts` - Fastify route wiring, auth parsing, request schema parsing, HTTP error mapping.
- `service.ts` - business rules, RBAC checks, orchestration, audit side effects.
- `repository.ts` - Prisma queries and transactions only.
- focused helper files - pure calculations, search builders, mappers, cursor helpers, or small domain utilities.
- `*.test.ts` - route or pure-function tests close to the module.

Start API work from the module README when present, then `routes.ts`, then `service.ts`, and only then the specific repository/helper file.
