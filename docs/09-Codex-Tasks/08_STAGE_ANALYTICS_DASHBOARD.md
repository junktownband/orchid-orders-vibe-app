# Stage 8 — Analytics Dashboard API

## Цель

Сделать backend-аналитику и dashboard endpoint для Orchid Control без Google-интеграций. Все данные берутся из локальной PostgreSQL через Prisma.

## Текущий контракт KPI

- paid revenue;
- accrued revenue;
- confirmed expenses;
- unpaid master commissions;
- net cash;
- monthly series;
- expenses by category;
- commissions by master.

`accountsReceivableCents` больше не входит в контракт dashboard. Предоплаты отражаются на заказах как `PARTIALLY_PAID`, но отдельного процесса дебиторки и KPI дебиторки нет.

## Финансовая формула

`netCashCents = paidRevenueCents - confirmedExpensesCents - unpaidMasterCommissionsCents`

Подтвержденные расходы включают:

- обычные расходы `REGULAR`;
- системные налоги `TAX`;
- системные зарплатные расходы `SALARY`.

Выплаченные комиссии уже попадают в подтвержденные `SALARY` расходы, поэтому отдельно из net cash вычитаются только невыплаченные комиссии.

## Acceptance Criteria

- Dashboard API возвращает корректные KPI.
- Все суммы хранятся и отдаются в cents.
- Все запросы фильтруются по `organizationId`.
- `MASTER` не имеет доступа к dashboard endpoint.
- Есть тесты на net cash, отсутствие дебиторки в контракте и RBAC.

## Что не делать

- Не подключать Google.
- Не хранить деньги во float.
- Не обходить RBAC.
- Не возвращать дебиторку, пока для нее не появится отдельный продуктовый процесс.
