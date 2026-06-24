# Business Processes

This document is the canonical operational description for Orchid Control. Backend code remains the source of truth for persisted calculations and permissions.

## 1. Order Intake

Back-office user creates a repair order with customer, instrument, description, responsible person, and order items.

Order items define the money of the order:

- `SERVICE`: work performed by a concrete master;
- `MATERIAL`, `PART`, `STRINGS`, `OTHER`: resale or non-service positions.

The order total is always calculated from item prices. There is no separate manual "final received amount" field.

Fixed services from the catalog copy default client price and default service cost into the order item. The copied cost is already part of service profitability. Extra expenses can still be added later to the whole order or to a concrete service item.

## 2. Prepayment

Back-office user can add a prepayment from the order card before issue.

Required fields:

- amount;
- payment method;
- optional comment.

Rules:

- payment amount must be positive;
- payment amount cannot exceed current order balance;
- lower-than-balance payment makes the order `PARTIALLY_PAID`;
- exact-balance payment makes the order `PAID`;
- `OVERPAID` does not exist in the domain.

If order items are edited after a prepayment, the current balance changes from the recalculated order total minus accepted payments. The backend rejects states where accepted payments exceed the order total.

## 3. Order Work

Orders are transparent inside the organization: every active role can open the order list and order detail. Masters work only inside the orders area and do not get back-office surfaces such as dashboard, expenses, payouts, settings, audit, catalog management, margin, costs, or commission-impact hints.

Back-office users can edit order items, assign service-line masters, add item expenses, and change normal repair status before issue. Masters can only move visible orders through the working statuses `IN_PROGRESS` and `READY`.

## 4. Expenses

Manual expenses are always `REGULAR`.

They can be:

- general, without an order link;
- linked to a whole order;
- linked to a concrete order item.

Only confirmed regular item-level expenses linked to a `SERVICE` line reduce that service line's master commission base.

System expense kinds are never created manually:

- `TAX` is created by order issue;
- `SALARY` is created by marking a master commission as paid.

Expense categories and payment methods are managed in settings by `OWNER` and `ADMIN`. `MANAGER` can use active reference rows but cannot manage the lists.

## 5. Issue And Final Payment

Issue closes the order. The backend uses the current order total from items.

At issue:

1. Backend reads current order total.
2. Backend checks already accepted payments.
3. If balance remains, user must select a payment method.
4. Backend creates one payment for the remaining balance.
5. Order becomes `ISSUED`.
6. Payment status becomes `PAID`.
7. Order edits, payments, assignee, and status changes are locked.

The user does not enter a final amount during issue. If the total must change, order items must be edited before issue.

## 6. Tax

Tax mode is organization-level:

- `NONE`;
- `SELF_EMPLOYED`.

Only `OWNER` can enable or disable tax mode. `ADMIN` and `MANAGER` can read it but cannot change it.

If `SELF_EMPLOYED` is enabled, issue asks who the client is:

- individual: 4%;
- business or individual entrepreneur: 6%.

Tax is calculated from the full current order total before expenses and before master commissions.

Issue stores tax snapshots on the order and creates one confirmed system expense with `kind = TAX`.

## 7. Commission Calculation

Commission is calculated per service line, not per order.

For each `SERVICE` item:

```text
commissionBase =
  allocated service revenue
  - allocated order tax
  - copied item cost
  - confirmed regular expenses linked to that service item
```

Then:

```text
commission = round(commissionBase * master commission percent snapshot)
```

Rules:

- only service items generate commission;
- each service item uses its own assigned master;
- percent is snapshotted from the master membership at issue time;
- order tax is allocated proportionally across item revenue;
- resale/material items do not generate master commission;
- whole-order expenses do not reduce a concrete master's commission until an explicit allocation rule exists.

## 8. Commission Payout

The payout screen is the working register for master commissions.

Back-office users can filter by:

- master;
- payout status;
- accrual period.

When an owner/admin marks a commission as paid:

1. Commission line becomes `PAID`.
2. Backend stores payout timestamp and paying user.
3. Backend creates one confirmed system expense with `kind = SALARY`.
4. That salary expense is linked to the order and service item.

Manual salary expenses are forbidden.

## 9. Dashboard Money

Dashboard net cash is:

```text
paid revenue - confirmed expenses - unpaid master commissions
```

Paid revenue is the sum of non-voided accepted payment records in the period. It is not the sum of full order totals by `paidAt`.

Confirmed expenses already include tax and paid salary expenses. Paid commissions are not subtracted twice.

Partially paid orders are visible as `PARTIALLY_PAID`, but there is no separate receivables workflow or KPI in the current product.

## 10. Roles

- `OWNER`: full access, including tax mode changes.
- `ADMIN`: operational admin access, but cannot change owner-only tax mode.
- `MANAGER`: operational work with orders, expenses, catalog, analytics, audit, and active reference values.
- `MASTER`: transparent order reads plus working status changes to `IN_PROGRESS` and `READY`; no money, settings, expenses, payouts, analytics, catalog management, audit, create/edit/cancel/issue, assignee, or item mutations.
