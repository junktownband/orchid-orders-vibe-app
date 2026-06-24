# Business Rules

## Source Of Truth

- Backend is the source of truth for business actions and financial calculations.
- Frontend may show previews, but persisted money values and final statuses come from the API.
- Money is stored as integer cents.
- Dates are stored in UTC and displayed in the organization timezone.

## Orders

- `CANCELLED` orders are excluded from revenue and dashboard status analytics.
- Repair order list/detail reads are transparent for every active role inside the organization.
- Order create/edit/issue/payment actions are available to `OWNER`, `ADMIN`, and `MANAGER`.
- `MASTER` can read the orders area and move orders to `IN_PROGRESS` or `READY`; back-office sections and all order money, item, assignee, cancel, and issue mutations are hidden in the UI and forbidden by the API.
- Order total is calculated from current order items. There is no manual final-amount input at issue time.
- Prepayments can be accepted before issue, but the accepted amount cannot exceed the current order balance.
- At issue time the backend automatically accepts the remaining balance if one exists.
- After issue, order items, assignee, status, payment and total amount are locked.
- Payment corrections use a void flow. Voided payment records stay in history but are excluded from accepted payment totals and dashboard cash.

## Tax

- Organization tax settings have only two modes: `NONE` and `SELF_EMPLOYED`.
- Only `OWNER` can enable or disable organization tax mode. `ADMIN` and `MANAGER` can read the setting but cannot change it.
- If `SELF_EMPLOYED` is enabled, the tax subject is selected during order issue:
  - `INDIVIDUAL`: 4%;
  - `BUSINESS`: 6%.
- Tax is calculated from the current order total, before any expenses are considered.
- Order issue creates one confirmed system expense with `kind = TAX`.
- Manual expense creation cannot set `kind = TAX`.

## Expenses

- Manual expenses are always regular expenses.
- A regular expense can be linked to a whole order or to a concrete order item.
- Only confirmed regular item-level expenses reduce the commission base of that concrete service line.
- Whole-order regular expenses do not reduce a specific master's commission until a separate allocation rule exists.
- `SALARY` is a system expense kind created only when a master commission is marked paid.
- Manual expense creation cannot set `kind = SALARY`.
- Regular expenses can be voided with a reason. System expenses are corrected by their owning system flow and cannot be manually voided.

## Service Catalog

- Fixed services store both the default client price and the default service cost.
- When a fixed service is added to an order, both values are copied into the order item snapshot.
- The copied service cost immediately reduces the commission base for that service.
- Additional materials, purchases, or unusual costs can still be added later as regular item-level expenses for the same service.
- Expense guidance about commission recalculation is back-office only and must not be shown in master-facing order views.

## Master Commissions

Commission is calculated per service line, not per whole order.

Formula:

```text
commissionBaseCents =
  allocatedServiceRevenueCents
  - allocatedTaxCents
  - item.costCents
  - confirmedRegularItemExpensesCents
```

Then:

```text
commissionAmountCents = round(commissionBaseCents * commissionPercentSnapshot)
```

Rules:

- Only `SERVICE` items generate master commission.
- The service master is stored on `RepairOrderItem.assignedMasterMembershipId`.
- The percent snapshot is taken from `Membership.commissionPercent` at issue time.
- The order tax is allocated across order lines proportionally to final line revenue.
- If a confirmed regular item expense is added after issue, only unpaid commission lines are recalculated.
- Paid commission lines keep the already paid snapshot.
- Marking a commission paid creates a confirmed `SALARY` expense linked to the same order and item.

## Dashboard Money

Current dashboard net cash:

```text
paidRevenueCents - confirmedExpensesCents - payableCommissionsCents
```

`paidRevenueCents` is calculated from non-voided accepted payment records inside the period. It must not use full order totals by `paidAt`, because a partially paid order can move less cash than its total.

`confirmedExpensesCents` already includes taxes and paid salary expenses. `payableCommissionsCents` covers only still-unpaid master commissions, so paid commissions are not subtracted twice.

Receivables are intentionally removed from the current dashboard contract. A partially paid order stays `PARTIALLY_PAID` until issue accepts the remaining balance; it is not presented as a separate debtor workflow.

## Roles

- `OWNER`: full access.
- `ADMIN`: full operational access except organization ownership actions and tax mode changes.
- `MANAGER`: orders, expenses, catalog, settings read, analytics, and audit where allowed.
- `MASTER`: transparent order reads plus working status changes to `IN_PROGRESS` and `READY`; no money, settings, expenses, payouts, analytics, catalog management, audit, cancel/issue, assignee, item, or create-order mutations.
