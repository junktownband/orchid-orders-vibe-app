# Stage 4 — Settings and Reference Data

## Цель

Сделать настройки справочников и пользователей.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 4 — Settings and Reference Data

Задача:
Реализуй API настроек: payment methods, expense categories, members/commissions, organization settings. На frontend пока можно сделать простой settings screen.

Требования:
- CRUD для способов оплаты
- CRUD для категорий расходов
- управление commissionPercent у мастеров
- organization settings

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- Owner/Admin видят settings.
- Manager/Master не могут менять настройки.
- Справочники используются API форм заказов/расходов.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
