# API Contract

Base URL:

```text
/api/v1
```

## Auth

```text
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET  /auth/me
```

## Dashboard / Analytics

```text
GET /analytics/dashboard?from=2026-01-01&to=2026-01-31
GET /analytics/cashflow?year=2026
GET /analytics/expenses-by-category?from=...&to=...
GET /commissions?masterMembershipId=...&payoutStatus=UNPAID&from=2026-01-01&to=2026-01-31
```

Dashboard response:

```ts
type DashboardResponse = {
  period: { from: string; to: string }
  kpis: {
    paidRevenueCents: number
    accruedRevenueCents: number
    confirmedExpensesCents: number
    accruedCommissionsCents: number
    paidCommissionsCents: number
    payableCommissionsCents: number
    netCashCents: number
    repairOrdersCount: number
    paidOrdersCount: number
    unpaidOrdersCount: number
    averagePaidTicketCents: number
  }
  repairsByStatus: Array<{ status: string; count: number }>
  expensesByCategory: Array<{ category: string; amountCents: number }>
  monthlySeries: Array<{
    month: string
    paidRevenueCents: number
    expensesCents: number
    commissionsCents: number
    netCashCents: number
  }>
}
```

Current finance rule: dashboard does not expose receivables. `netCashCents` is paid revenue minus confirmed expenses minus unpaid master commissions. Confirmed expenses include system `TAX` and system `SALARY` rows.

## Repair Orders

```text
GET    /repair-orders
POST   /repair-orders
GET    /repair-orders/:id
PATCH  /repair-orders/:id
POST   /repair-orders/:id/status
POST   /repair-orders/:id/commission-override
DELETE /repair-orders/:id
```

Query filters:

```text
search
repairStatus
paymentStatus
masterId
from
to
page
limit
```

Create repair order DTO:

```ts
type CreateRepairOrderDto = {
  customer: {
    name: string
    phone?: string
    email?: string
  }
  instrument?: {
    type?: string
    brand?: string
    model?: string
    serialNumber?: string
    note?: string
  }
  description: string
  totalAmountCents: number
  assignedMasterMembershipId?: string
  acceptedAt?: string
  comment?: string
}
```

## Payments

```text
POST /repair-orders/:id/mark-paid
POST /repair-orders/:id/issue
```

Add payment or prepayment DTO:

```ts
type AddRepairOrderPaymentDto = {
  amountCents?: number
  paymentMethodId: string
  comment?: string
}
```

`amountCents` cannot exceed the current order balance. Omit it to accept the full balance.

Issue DTO:

```ts
type IssueRepairOrderDto = {
  paymentMethodId?: string
  taxSubject?: "INDIVIDUAL" | "BUSINESS"
}
```

Issue uses the current order total from items. It never accepts a manually entered final amount. If the order has an unpaid balance, `paymentMethodId` is required and the backend creates a payment for the remainder.

## Expenses

```text
GET   /expenses
POST  /expenses
GET   /expenses/:id
PATCH /expenses/:id
POST  /expenses/:id/confirm
POST  /expenses/:id/void
```

Create expense DTO:

```ts
type CreateExpenseDto = {
  categoryId?: string
  amountCents: number
  spentAt: string
  spentByName?: string
  paymentMethodId?: string
  description: string
  repairOrderId?: string
  comment?: string
}
```

Manual expense creation cannot set `kind`. Public creates are regular expenses only; `TAX` is created by order issue and `SALARY` is created by commission payout.

## Settings

```text
GET   /settings
PATCH /settings
GET   /settings/payment-methods
POST  /settings/payment-methods
PATCH /settings/payment-methods/:id
GET   /settings/expense-categories
POST  /settings/expense-categories
PATCH /settings/expense-categories/:id
GET   /settings/members
POST  /settings/members
PATCH /settings/members/:id
```

Tax mode changes are owner-only. `GET /settings` is available to back-office roles, but `PATCH /settings/tax` must reject every role except `OWNER`.

## Audit

```text
GET /audit?entityType=RepairOrder&entityId=...
```
