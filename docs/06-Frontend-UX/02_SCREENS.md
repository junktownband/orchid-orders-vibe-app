# Screens

## Login

Email/password login. No registration in the MVP.

## Dashboard

Back-office summary for `OWNER`, `ADMIN`, and `MANAGER`.

Primary cards:

- net cash for the current month;
- paid revenue;
- gross profit;
- margin;
- payable master commissions;
- order count.

Receivables are intentionally not shown. Prepayments are tracked on orders, but partially paid orders are not a separate debtor workflow.

## Orders

The only area visible to `MASTER`.

List features:

- search by order number, customer, phone, instrument, or master;
- repair status filter;
- payment status filter;
- tabs for all, ready, active, and completed orders.
- compact/table-like mode for daily scanning;
- card mode for expanded order context.

Order card:

- customer and instrument summary;
- status and payment state;
- paid amount, remaining balance, and payment history for back-office users;
- service/material lines;
- item-level master assignment for service lines;
- item-level expense entry points for managers/admins;
- issue flow for managers/admins.

For `MASTER`, the order card allows only working status changes to `IN_PROGRESS` and `READY`; other management actions stay hidden and the card does not load back-office APIs such as expenses, audit, or service catalog.
Master-facing order views must not show order totals, cost, gross profit, margin, or item prices.
Back-office users see financial summaries and can perform final actions.

Accepting order payment must use a confirmation dialog with the order number, customer, payment method, and payment amount. The amount cannot exceed the current balance. A lower amount is treated as prepayment.

Issue screen:

- never asks for a manual final amount;
- shows the current order total from items;
- shows already paid amount and remainder;
- asks for payment method only when a remainder exists;
- asks for tax subject only when self-employment tax is enabled.

## Expenses

Back-office register for `OWNER`, `ADMIN`, and `MANAGER`.

Manual expenses are regular expenses only. System rows are visible in the list:

- `TAX`: created when a self-employed order is issued;
- `SALARY`: created when a master commission is marked paid.

Users cannot manually create `TAX` or `SALARY` expenses.
Confirming a draft expense must use a confirmation dialog. If the expense is linked to a concrete order item, the UI must explain that unpaid master commission may be recalculated.
This guidance is back-office only. `MASTER` must not see expense creation screens or commission-impact hints.

## Payouts

Back-office section for master commission payouts.

Shows:

- accrued commissions;
- already paid commissions;
- unpaid commissions;
- filters by master, payout status, and accrual period;
- grouped totals by master for the current filter set;
- service line, order number, master, commission base and percent;
- action to mark an unpaid commission as paid.

Marking a commission as paid creates a confirmed `SALARY` expense.
The paid action must use a confirmation dialog that shows master, order, service, commission base, percent, amount, and the fact that a `SALARY` expense will be created.

## Settings

Back-office settings only. Hidden from `MASTER`.

Current sections:

- profile/logout;
- tax mode: no self-employment or self-employment;
- masters and commission percent;
- fixed services;
- payment methods;
- expense categories;
- audit log.

If self-employment is enabled, the customer tax subject is selected during order issue, not in settings.
Only `OWNER` can enable or disable tax mode. `ADMIN` and `MANAGER` may read the current mode but cannot change it.

Fixed service settings include the default client price and default service cost. Both values are copied into the order item when the service is added to an order. Additional item-level expenses remain available for unusual materials or purchases.
