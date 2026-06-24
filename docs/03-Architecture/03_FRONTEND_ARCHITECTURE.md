# Frontend Architecture

## Основной принцип

Приложение должно ощущаться как мобильное приложение, а не админка.

Desktop — это расширенный mobile layout:

- слева может появляться sidebar;
- карточки становятся сеткой;
- таблицы допустимы только как вторичный режим просмотра.

## Навигация

Mobile bottom nav:

- Главная;
- Заказы;
- Расходы;
- Аналитика;
- Настройки.

Floating Action Button:

- Новый ремонт;
- Новый расход;
- Принять оплату;
- Новый клиент.

## State

- Server state: TanStack Query.
- Form state: React Hook Form.
- UI state: Zustand только если реально нужно.
- Auth state: отдельный provider + query `/auth/me`.

## Формы

Все формы должны быть:

- короткие;
- разделены на понятные блоки;
- mobile-friendly;
- с большими input;
- с умными defaults;
- с bottom sheet UX на телефоне;
- с Zod validation.

## API client

`shared/api/client.ts`:

- fetch wrapper;
- автоматическая обработка 401;
- credentials include для cookies;
- typed methods.

## Ошибки UX

- Ошибки в форме показывать рядом с полем.
- Общие ошибки — toast.
- Успех — короткий toast + optimistic update там, где безопасно.

## Loading states

- Skeleton cards.
- Не показывать пустую белую страницу.
- Для дашборда — skeleton KPI cards.

## Empty states

Примеры:

- “Заказов пока нет. Добавь первый ремонт за 30 секунд.”
- “Расходов пока нет. Отлично, бизнес пока не жрет деньги.”
- “Нет оплат за период. Проверь фильтр дат.”
