# Stage 3 — Auth and RBAC

## Цель

Реализовать вход, текущего пользователя и проверки ролей.

## Входной промпт для Codex

```text
Ты работаешь над Orchid Control. Никаких Google-сервисов, Google Sheets, Forms, Apps Script. Все данные — локальный PostgreSQL через Prisma.

Текущий этап: Stage 3 — Auth and RBAC

Задача:
Добавь auth module: login/logout/refresh/me. Пароли hash. Refresh в httpOnly cookie. Добавь RBAC guard и helper для organization scope.

Требования:
- JWT access + refresh
- httpOnly cookie
- bcrypt/argon2
- role guard
- organization scope guard

После реализации:
- обнови docs/CHANGELOG.md;
- проверь типизацию;
- добавь или обнови тесты там, где есть бизнес-логика;
- не делай лишних функций вне этапа.
```

## Acceptance Criteria

- Owner может войти.
- `/auth/me` возвращает user, organization, role.
- Protected routes без токена возвращают 401.
- Forbidden action возвращает 403.

## Что не делать

- Не подключать Google.
- Не делать основной UI в виде Excel-таблицы.
- Не хранить деньги во float.
- Не обходить RBAC.
