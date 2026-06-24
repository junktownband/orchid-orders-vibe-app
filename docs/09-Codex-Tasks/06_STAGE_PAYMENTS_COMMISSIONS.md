# Stage 6 — Payments and Commissions

## Цель

Добавить оплаты, статусы оплаты и расчет комиссий.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 6 — Payments and Commissions

Задача:
Реализуй payments module. Добавление оплаты пересчитывает paymentStatus. Добавь commission calculation service. Фактическая комиссия перекрывает автоматическую.

Требования:
- prepayments that cannot exceed the current order balance
- paymentStatus calculation
- no overpayment status in the active domain
- commission auto/fact
- void payment for owner/admin

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- Оплата меняет статус заказа.
- Частичная оплата дает PARTIALLY_PAID.
- Полная оплата дает PAID.
- Комиссия считается только для PAID.
- Override комиссии пишется в audit.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
