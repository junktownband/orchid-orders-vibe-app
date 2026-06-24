# Domain Model

## Organization

Tenant boundary. Every operational entity is scoped by `organizationId`.

Settings include currency, timezone, and tax mode.

## User And Membership

`User` stores identity and login data.

`Membership` connects a user to an organization and stores:

- role;
- active state;
- master commission percent for master-like work.

Current roles:

- `OWNER`;
- `ADMIN`;
- `MANAGER`;
- `MASTER`.

Repair order reads are transparent inside an organization: every active role can open order lists and order detail. `MASTER` can only move work through `IN_PROGRESS` and `READY`; masters are blocked from order creation/editing/issue, money mutations, settings, expenses, payouts, catalog management, analytics, and audit APIs.

## Customer And Instrument

Customers and instruments are canonical records linked to repair orders.

Customer profile edits update the customer record. Historical change history is preserved through audit logs.

## Repair Order

Repair order is the main operational workflow.

Important fields:

- `orderNumber`;
- `repairStatus`;
- `paymentStatus`;
- `totalAmountCents`;
- `totalCostCents`;
- `grossProfitCents`;
- tax snapshots;
- issue/payment timestamps;
- line items.

Issue locks the order for further item/status/payment/assignee changes.

## Repair Order Item

Order item represents a concrete service, material, string set, part, or other line.

Only `SERVICE` items generate master commission.

Service-line commission fields:

- `assignedMasterMembershipId`;
- `commissionPercentSnapshot`;
- `commissionBaseCents`;
- `commissionAmountCents`;
- `commissionCalculatedAt`;
- `commissionPayoutStatus`;
- `commissionPaidAt`;
- `commissionPaidByUserId`.

## Expense

Expense is cash accounting.

Kinds:

- `REGULAR`: manually created business expense;
- `TAX`: system expense created at order issue when self-employment tax applies;
- `SALARY`: system expense created when a master commission is marked paid.

Manual expense creation cannot set `kind`; public creates are always regular expenses.

Regular expenses can be linked to:

- no order;
- a whole order;
- a concrete order item.

Only confirmed regular item-level expenses reduce the commission base for that service item.

## Master Commission

Commission is not a separate table. It is stored as a snapshot on `RepairOrderItem`.

Formula:

```text
commissionBaseCents =
  allocatedServiceRevenueCents
  - allocatedTaxCents
  - item.costCents
  - confirmedRegularItemExpensesCents
```

```text
commissionAmountCents = round(commissionBaseCents * commissionPercentSnapshot)
```

When a commission is marked paid:

1. The item payout status changes from `UNPAID` to `PAID`.
2. The system writes payout timestamp and paying user.
3. The system creates a confirmed `SALARY` expense linked to the same order and item.

## Dashboard Finance

Current net cash:

```text
paidRevenueCents - confirmedExpensesCents - payableCommissionsCents
```

`paidRevenueCents` is the sum of non-voided accepted payment records in the dashboard period, not the sum of full order totals by `paidAt`.

Confirmed expenses already include tax and paid salary rows. Payable commissions are only unpaid commission liabilities.

Receivables are intentionally outside the current dashboard contract. Prepayments are tracked on orders through payment history and `PARTIALLY_PAID` status.
