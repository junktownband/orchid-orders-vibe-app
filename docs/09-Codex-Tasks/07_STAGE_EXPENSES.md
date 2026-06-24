# Stage 7 — Expenses

## Цель

Добавить расходы, подтверждение и void.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 7 — Expenses

Задача:
Реализуй expenses module: create/list/detail/update/confirm/void. Расход может быть связан с заказом. Только confirmed учитывается в главной аналитике.

Требования:
- ExpenseStatus DRAFT/CONFIRMED/VOIDED
- category
- payment method
- linked repair order optional
- audit confirm/void

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- Расход создается.
- Расход подтверждается.
- Void расход не участвует в аналитике.
- Фильтры по периоду/категории/статусу работают.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
