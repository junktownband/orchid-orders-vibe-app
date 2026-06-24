# Monorepo Architecture

## Целевая структура

```text
orchid-control/
  apps/
    api/
      src/
        modules/
          auth/
          users/
          organizations/
          customers/
          instruments/
          repair-orders/
          payments/
          expenses/
          analytics/
          settings/
          audit/
        plugins/
        lib/
        server.ts
      package.json
      tsconfig.json
    web/
      src/
        app/
        pages/
          dashboard/
          repairs/
          expenses/
          analytics/
          settings/
          login/
        widgets/
        features/
          repair-order/
          payment/
          expense/
          customer/
          analytics/
          auth/
        entities/
        shared/
          api/
          ui/
          lib/
          config/
          styles/
      package.json
      vite.config.ts
      tailwind.config.ts
  packages/
    db/
      prisma/
        schema.prisma
        seed.ts
      src/
        client.ts
      package.json
    shared/
      src/
        schemas/
        types/
        constants/
      package.json
    config/
      eslint/
      tsconfig/
  docs/
    CHANGELOG.md
    API.md
    DEPLOYMENT.md
  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  .env.example
```

## Backend

Fastify modules по доменам. Каждый модуль должен иметь:

```text
module/
  routes.ts
  service.ts
  repository.ts
  schemas.ts
  permissions.ts
  tests/
```

Правило:

- `routes.ts` — HTTP слой;
- `schemas.ts` — Zod валидация;
- `service.ts` — бизнес-логика;
- `repository.ts` — Prisma запросы;
- `permissions.ts` — проверки ролей.

## Frontend

Структура близко к Feature-Sliced Design, но без фанатизма.

- `pages` — экраны;
- `features` — формы и бизнес-функции;
- `entities` — отображение сущностей;
- `shared/ui` — дизайн-система;
- `shared/api` — клиент API;
- `widgets` — крупные блоки: bottom nav, dashboard cards, quick actions.

## Shared package

В `packages/shared` хранить:

- Zod-схемы DTO;
- enum статусов;
- типы API;
- утилиты форматирования денег/дат.

## DB package

В `packages/db` хранить:

- Prisma schema;
- Prisma client;
- seed;
- миграции.

## Локальный запуск

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Env

```env
DATABASE_URL="postgresql://orchid:orchid@localhost:5432/orchid_control?schema=public"
JWT_ACCESS_SECRET="change-me-access"
JWT_REFRESH_SECRET="change-me-refresh"
APP_URL="http://localhost:5173"
API_URL="http://localhost:3005"
NODE_ENV="development"
```
