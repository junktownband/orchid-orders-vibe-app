# Prisma Area

Read this folder only for data model, migration, seed, or DB-index work.

- `schema.prisma` - current data model.
- `seed.ts` - local development seed.
- `migrations/` - historical migration SQL. Do not read every migration unless the task is about DB history or migration repair.

Business logic does not belong in Prisma models. Keep calculations in API modules and store only durable facts/snapshots.
