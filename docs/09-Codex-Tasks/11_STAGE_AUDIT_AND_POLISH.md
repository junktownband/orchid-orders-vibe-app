# Stage 11 — Audit and Polish

## Цель

Добавить аудит в UI и отполировать UX.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 11 — Audit and Polish

Задача:
Сделай audit timeline на detail screen и settings/audit. Добавь microinteractions, toasts, empty states, role-based UI hiding.

Требования:
- audit timeline
- role-based menus
- better toasts
- polish mobile UX
- accessibility basics

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- В истории заказа видны события.
- MASTER не видит запрещенные кнопки.
- Формы удобны на телефоне.
- Нет грубых визуальных багов.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
