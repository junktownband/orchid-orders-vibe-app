# Orders Feature

Read only the file for the workflow you are changing:

- `OrdersListPage.tsx` - search, filters, pagination, compact rows, and optional order cards in the list.
- `OrderDetailPage.tsx` - data loading and order mutation orchestration for the detail screen.
- `OrderDetailPanels.tsx` - order summary, customer edit block, service lines, item expenses entry points, final actions, payment confirmation, and audit timeline.
- `IssueOrderPage.tsx` - issuing/closing an order, self-employed tax subject selection, automatic remainder payment, and tax preview.
- `OrderCreatePage.tsx` - intake form, customer/instrument fields, service catalog insertion, resale lines, and draft line validation.

Shared order helpers live in `../../app/app-core.ts`; backend money rules live in `apps/api/src/modules/repair-orders`.
