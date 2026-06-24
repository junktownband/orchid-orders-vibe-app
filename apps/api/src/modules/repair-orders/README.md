# Repair Orders Module

Repair orders are the busiest backend module. Use the smallest file that matches the task.

## Files

- `routes.ts` - HTTP endpoints and request parsing.
- `service.ts` - RBAC, tax subject rules, status transitions, audit writes.
- `repository.ts` - Prisma transactions and query composition.
- `commission-calculation.ts` - pure allocation and master commission base math.
- `search.ts` - order number and phone search normalization.
- `repair-orders.test.ts` - auth checks plus pure calculation/search tests.

## Business Anchors

- Order numbers are stored without the `R-` prefix, but search accepts legacy `R-0001` input.
- Tax is calculated from the final paid order amount, independent of expenses.
- Master commission is per `SERVICE` line: allocated service revenue minus allocated tax, item cost, and confirmed regular expenses linked to that service.
- Late confirmed item expenses recalculate unpaid issued-order commissions; paid commission lines are not overwritten.
