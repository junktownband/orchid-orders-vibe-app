# Shared API Schemas

This folder is the source of truth for request and response schemas shared by the API and web app.

Use `api.ts` as the public barrel. Put actual contracts in `api/*.ts` by domain:

- `common.ts`: money, health, errors, phone and shared enums.
- `auth.ts`: login and current user responses.
- `repair-orders.ts`: order create/update/query/issue contracts.
- `service-catalog.ts`: service catalog create/list contracts.
- `settings.ts`: organization settings, members and master list contracts.
- `customers.ts`: customer update and response contracts.
- `expenses.ts`: manual expense contracts.
- `commissions.ts`: master commission list and payout contracts.
- `dashboard.ts`: analytics/dashboard response contracts.
- `audit.ts`: audit log contracts.

For API changes:

1. Update the relevant domain schema/type.
2. Keep `api.ts` as a barrel so old `@orchid/shared` imports remain stable.
3. Update API service/repository code.
4. Update web usage.
5. Update `docs/API.md` only with semantic contract notes, not full schema copies.
