# Backend Architecture

## Основной принцип

Backend — единственный источник бизнес-логики.

Frontend может показывать промежуточные значения для UX, но финальные суммы всегда приходят с API.

## Слои

### HTTP layer

- Fastify routes.
- Zod validation.
- Auth guard.
- RBAC guard.
- Response mapping.

### Service layer

- бизнес-правила;
- расчет денег;
- audit events;
- транзакции.

### Repository layer

- Prisma queries;
- оптимизированные include/select;
- пагинация;
- фильтры.

## Транзакции

Использовать Prisma transaction для:

- создания заказа + audit log;
- добавления оплаты + пересчет derived snapshot при необходимости;
- изменения комиссии + audit log;
- подтверждения расхода + audit log.

## Derived поля

Не хранить всё подряд, но для скорости можно хранить snapshot поля:

- `RepairOrder.totalAmountCents`;
- `RepairOrder.paidAmountCents` можно либо вычислять, либо обновлять транзакционно;
- `RepairOrder.paymentStatus` можно вычислять на чтении, но для фильтров удобнее хранить и обновлять.

MVP-решение:

- хранить `totalAmountCents`;
- хранить `paymentStatus`;
- при добавлении/void оплаты пересчитывать `paymentStatus`.

## Ошибки

Единый формат ответа:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные",
    "details": []
  }
}
```

## Пагинация

Для списка заказов используется cursor pagination:

```text
GET /repair-orders?limit=20&tab=active&q=strat&cursor=<opaque-cursor>
```

Cursor кодирует серверный порядок сортировки: готовые заказы, активные, завершенные; внутри группы — последние обновленные.

## Поиск

Поиск заказов выполняется на backend и совместим с cursor pagination:

- `ILIKE` по клиенту, телефону, инструменту, номеру заказа и ответственному мастеру;
- телефон дополнительно ищется по нормализованным цифрам;
- поля поиска покрыты PostgreSQL `pg_trgm` GIN-индексами.

## Отчеты

Аналитика должна быть отдельным модулем `analytics`.

Endpoint не должен отдавать сырые таблицы, он должен отдавать готовые KPI и серии для UI.
