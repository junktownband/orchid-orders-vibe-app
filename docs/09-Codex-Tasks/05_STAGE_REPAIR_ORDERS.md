# Stage 5 — Repair Orders

## Цель

Реализовать ядро заказов на ремонт.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 5 — Repair Orders

Задача:
Создай repair-orders module: create/list/detail/update/status. Создание заказа должно уметь создать клиента и инструмент. Реализуй поиск и фильтры.

Требования:
- карточная логика заказов
- customer/instrument handling
- repairStatus
- paymentStatus default UNPAID
- audit on create/update/status

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- Можно создать заказ.
- Можно найти заказ по клиенту/телефону/описанию.
- MASTER видит все заказы организации и может менять только рабочие статусы.
- Изменение статуса пишется в audit.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
