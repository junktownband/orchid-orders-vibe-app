# Analytics Spec

Analytics is calculated on the backend from PostgreSQL. Frontend screens display ready KPI values and do not recompute business totals as source of truth.

## Period

The default period is the current calendar month in the organization's timezone.

Dates are stored in UTC. The backend builds local month boundaries for the organization timezone and converts them to UTC before querying PostgreSQL. Example: June 2026 in `Asia/Yekaterinburg` starts at `2026-05-31T19:00:00.000Z`.

## Current KPI

### paidRevenueCents

Sum of non-voided accepted `Payment.amountCents` records where `createdAt` falls inside the period and the related repair order is not deleted or cancelled.

This is intentionally payment-based rather than order-total-based. A partially paid order can move less cash than its `totalAmountCents`, and dashboard cash must reflect the actual payment records for the period.

### accruedRevenueCents

Sum of non-cancelled repair order `totalAmountCents` created inside the period.

### confirmedExpensesCents

Sum of `Expense.amountCents` where `status = CONFIRMED` and `spentAt` falls inside the period.

This includes:

- manual regular expenses;
- system tax expenses with `kind = TAX`;
- system master payout expenses with `kind = SALARY`.

### accruedCommissionsCents

All master commissions accrued in the period by `RepairOrderItem.commissionCalculatedAt`, regardless of payout status.

### paidCommissionsCents

Commissions marked as paid to masters inside the period by `commissionPaidAt`.

When a commission is marked paid, the system also creates a confirmed `SALARY` expense. Because of that, paid commissions must not be subtracted from net cash a second time.

### payableCommissionsCents

Accrued master commissions still unpaid:

```text
sum(RepairOrderItem.commissionAmountCents where commissionPayoutStatus = UNPAID)
```

### netCashCents

```text
paidRevenueCents - confirmedExpensesCents - payableCommissionsCents
```

### averagePaidTicketCents

```text
paidRevenueCents / acceptedPaymentsCount
```

Return `0` if `acceptedPaymentsCount = 0`.

## Removed KPI

`accountsReceivableCents` is intentionally not part of the current dashboard contract. The app supports prepayments, but partially paid orders remain operational order states rather than a separate debtor workflow.

## Important Rules

- Do not count cancelled orders in revenue or status analytics.
- Do not count voided payments in paid revenue.
- Do not count draft or voided expenses.
- Keep all monetary fields as integer cents.
- Scope every analytics query by `organizationId`.
