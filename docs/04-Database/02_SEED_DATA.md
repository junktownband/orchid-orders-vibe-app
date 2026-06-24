# Seed Data

`packages/db/prisma/seed.ts` has two modes:

- production seed: default `pnpm db:seed`;
- demo seed: explicit `pnpm db:seed:demo`.

## Production Seed

Production seed creates only the organization, basic settings, reference data, and the approved user set. It removes known demo orders and deactivates every other membership in the seeded organization.

Organization:

```text
name: Orchid Workshop
currency: RUB
timezone: Asia/Yekaterinburg
taxMode: NONE
```

Users:

```text
sasha@orchid.local / OWNER / Саша
roma@orchid.local / ADMIN / Рома
yura@orchid.local / ADMIN / Юра
lenya@orchid.local / ADMIN / Леня
vanya@orchid.local / MANAGER / Ваня
dima@orchid.local / MASTER / Дима / 30% commission
```

All production seeded users use `ORCHID_SEED_PASSWORD`. The default production seed fails when that variable is missing, so the initial password is never created silently.

Demo seed uses this local walkthrough password when `ORCHID_SEED_PASSWORD` is not set:

```text
orchid12345
```

## Reference Data

Seed includes fixed services with default price and base service cost:

- Полная отстройка: 8000 RUB price, 500 RUB cost.
- Экранировка: 4000 RUB price, 300 RUB cost.
- Полировка ладов: 6000 RUB price, 400 RUB cost.

Payment methods:

- Наличные;
- Перевод;
- Терминал;
- Другое.

Expense categories:

- Материалы;
- Аренда;
- Доставка;
- Инструмент;
- Реклама;
- Другое.

Legacy dev rows named `Карта`, `Налоги`, and `Зарплаты` are deactivated when seed runs.

## Demo Seed

Use `pnpm db:seed:demo` only for local product walkthroughs. It starts from the production users/reference data, enables `SELF_EMPLOYED` tax mode, and adds demo orders, payments, expenses, commission snapshots, salary payout, and audit rows.
