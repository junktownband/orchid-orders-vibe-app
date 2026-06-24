# Stage 2 — Database and Prisma

## Цель

Добавить Prisma schema, миграции и seed.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 2 — Database and Prisma

Задача:
Перенеси черновик схемы из документации в Prisma schema. Настрой Prisma client в packages/db. Добавь seed organization, owner, payment methods, expense categories, demo masters.

Требования:
- PostgreSQL source of truth
- organizationId во всех бизнес-сущностях
- money fields as Int cents
- seed без Google/Excel логики

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- `pnpm db:migrate` создает таблицы.
- `pnpm db:seed` создает owner и справочники.
- Prisma client импортируется из packages/db.
- Нет таблиц/моделей для Google Forms/Sheets.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
