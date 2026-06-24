# Стартовый промпт для Codex

Ты работаешь над новым проектом **Orchid Control**.

Это не миграция Google Sheets и не таблица в браузере. Google Sheets, Google Forms, Apps Script, Google Drive и любые Google-интеграции запрещены. Все данные хранятся в локальной PostgreSQL базе. Ввод данных происходит через формы в React SPA. Backend считает аналитику через Prisma/PostgreSQL.

## Стек

- pnpm monorepo
- Node.js + TypeScript
- Fastify API
- Prisma ORM
- PostgreSQL
- React + Vite + TypeScript
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS
- Radix/shadcn-style components
- Framer Motion для мягких мобильных анимаций

## Сначала сделай

1. Создай структуру монорепы по [[03-Architecture/01_MONOREPO_ARCHITECTURE]].
2. Добавь базовые `README.md`, `.env.example`, `docker-compose.yml` для локального PostgreSQL.
3. Создай backend skeleton и frontend skeleton.
4. Не подключай Google-сервисы.
5. Не делай Excel/CSV источником данных.
6. Не делай основной UI табличным.

## Архитектурный принцип

Backend — единственный слой бизнес-логики:

- расчет оплаты;
- расчет статуса оплаты;
- расчет комиссии;
- расчет аналитики;
- проверка ролей;
- аудит действий.

Frontend — красивый и удобный клиент, но не источник истины.

## Работай по этапам

Открой [[09-Codex-Tasks/00_RUN_ORDER]] и выполняй задачи строго по порядку. После каждого этапа проверь:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Если на раннем этапе тестов еще нет, создай минимальную инфраструктуру и добавь тесты на критичную бизнес-логику.
