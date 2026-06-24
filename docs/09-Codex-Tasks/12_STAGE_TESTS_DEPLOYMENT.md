# Stage 12 — Tests and Deployment

## Цель

Подготовить проект к нормальному запуску на сервере.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 12 — Tests and Deployment

Задача:
Добавь тесты бизнес-логики, docker production notes, deployment doc for Ubuntu + pm2/nginx or Docker. Проверь build.

Требования:
- unit tests for money logic
- API tests for permissions
- deployment docs
- backup notes
- production env example

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- `pnpm test` проходит.
- `pnpm build` проходит.
- Есть DEPLOYMENT.md.
- Есть инструкция backup PostgreSQL.
- Нет внешних Google-зависимостей.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
