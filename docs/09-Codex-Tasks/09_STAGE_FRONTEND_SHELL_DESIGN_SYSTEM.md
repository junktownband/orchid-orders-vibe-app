# Stage 9 — Frontend Shell and Design System

## Цель

Создать красивую mobile-first оболочку и дизайн-систему.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 9 — Frontend Shell and Design System

Задача:
Реализуй AppShell, auth layout, bottom nav, glass cards, buttons, inputs, badges, money cards. Применить стиль dark glassmorphism iPhone modern.

Требования:
- Tailwind tokens
- dark gradient background
- glass components
- bottom navigation
- responsive desktop sidebar

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- Интерфейс выглядит как мобильное приложение.
- Есть bottom nav.
- Есть reusable UI components.
- Dashboard skeleton screen есть.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
