# Stage 10 — Frontend Forms and Screens

## Цель

Собрать основные экраны и формы.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 10 — Frontend Forms and Screens

Задача:
Сделай dashboard, repairs list/detail, new repair form, payment form, expenses list/form, settings screens. Подключи TanStack Query и RHF/Zod.

Требования:
- forms inside React
- no Google forms
- mobile bottom sheets or modal forms
- optimistic/safe invalidation
- empty/loading/error states

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- Можно создать ремонт из UI.
- Можно принять оплату из UI.
- Можно добавить расход из UI.
- Dashboard обновляется после действий.
- Основной UI не похож на таблицу.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
