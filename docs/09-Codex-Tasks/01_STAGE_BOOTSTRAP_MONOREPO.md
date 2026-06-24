# Stage 1 — Bootstrap Monorepo

## Цель

Создать базовую монорепу, которая запускается локально.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 1 — Bootstrap Monorepo

Задача:
Создай pnpm workspace с apps/api, apps/web, packages/db, packages/shared, packages/config. Настрой TypeScript, ESLint, Prettier, базовые package scripts, docker-compose с PostgreSQL, .env.example. API должен иметь health route. Web должен показывать стартовый экран Orchid Control.

Требования:
- pnpm workspaces
- docker-compose PostgreSQL
- Fastify API skeleton
- Vite React skeleton
- shared package
- db package
- scripts: dev, build, lint, typecheck, test

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- `pnpm install` работает.
- `docker compose up -d` поднимает PostgreSQL.
- `pnpm dev` запускает API и web.
- `/health` возвращает ok.
- Web открывается и показывает темный стартовый экран.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
