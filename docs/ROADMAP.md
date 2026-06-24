# Product & Technical Roadmap

## Now

- Keep API contracts stable and update shared Zod schemas together with docs.
- Preserve backend as the source of truth for tax, expenses, commission, payout, and RBAC rules.
- Add and keep tests for financial invariants:
  - tax from current order total;
  - prepayment cannot exceed order balance;
  - commission after tax, item cost, and confirmed item expenses;
  - system `TAX` and `SALARY` expenses only from backend workflows;
  - no double subtraction of paid commissions in dashboard net cash;
  - `MASTER` limited to order reads and working status changes.
- Keep seed data representative of the real workflow: self-employment tax, real production roles, item-level expenses, commission payout, and master login.
- Keep financial actions explicit and safe:
  - owner-only tax mode changes;
  - confirmation before marking commissions paid;
  - confirmation before confirming expenses;
  - confirmation before accepting order payment.
- Keep payment method and expense category settings confirmation/audit-backed when deactivated or changed.
- Keep master UI free from back-office finances: no order totals, cost, gross profit, or margin in master-facing order views.
- Keep payouts as a separate operational register with filters by master, payout status, and accrual period.
- Keep the payout register table-based on desktop so comparisons and bulk actions stay scan-friendly.
- Keep settings audit filters in the URL so refresh/back/share preserve the selected entity and action.
- Keep bulk master payouts explicit, confirmed, audit-backed, and transaction-safe.
- Keep order number allocation retry-safe when concurrent order creation wins the same number.
- Keep route-level smoke coverage for order create, payment, issue, expense confirmation, service catalog, and bulk payouts.
- Keep order list usable in both compact and card modes.
- Keep order detail split into focused UI components instead of growing the page container.
- Keep payment methods and expense categories configurable from settings.

## Later

- Add lightweight Playwright smoke checks only when browser verification is explicitly worth the token cost.
- Integrate with `Мой налог` only after the local self-employment tax workflow is stable.

## Non-goals

- Do not add Google Sheets, Forms, Drive, Excel, CSV, or Apps Script as application data stores.
- Do not introduce destructive database migrations for UI-only improvements.
- Do not change field names, statuses, roles, or payment semantics without an explicit product decision.
