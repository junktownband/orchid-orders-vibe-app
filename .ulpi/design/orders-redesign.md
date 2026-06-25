# Orders Redesign Spec

Bound to `.ulpi/design/DESIGN.md`. Every screen must read as the same product if placed side by side.

## Flow: Open Order From List

Goal: a user scans orders and opens the right order without hunting for a small action button.

Entry points: `/orders`, bottom navigation Orders item, browser back from an order card.

Steps:

1. The list loads with search, filters, tabs, and compact rows by default.
2. Each order row/card is one large button with a clear focus ring, pointer cursor, and subtle hover lift.
3. Click, Enter, or Space opens `/orders/:id`.
4. Browser back returns to the same filtered list via the existing URL query state.

States: loading row, empty state, request error, pagination loading, no more items. Errors stay visible above the list.

## Component: OrderListItem

Purpose: replace the separate "open order" button with a full-row or full-card hit target.

Variants:

- `compact`: dense row for daily scanning, one item per line on desktop.
- `card`: expanded item context with service lines.

Interaction:

- Default cursor is pointer because the whole surface opens the order.
- Nested item lines inside the card are not independent actions and do not get pointer treatment.
- Hover changes border and surface only; no glow.
- Focus uses the accent ring and remains keyboard-visible.
- Disabled state is not used because every loaded order can open.

Accessibility:

- Render as a real `<button type="button">`.
- `aria-label` includes order number, customer/instrument, repair status, and payment status.
- Enter and Space activate via native button behavior.

## Component: OrderDetailLayout

Purpose: make the order card easier to read by separating "summary and next action" from detailed editing.

Rules:

- Left panel is summary, customer, status, payment, audit, and final actions.
- Right panel is items and editing.
- Financial numbers are grouped and subordinate to status/action unless the user is in a back-office role.
- Repeated inner content uses hairline dividers and plain layout instead of nested cards whenever the outer glass panel already provides the frame.

## Handoff

Target agent: `react-vite-tailwind-engineer`.

Acceptance criteria:

- The full compact row and expanded card are clickable and open the order.
- The old "К заказу" button is removed from list items.
- Buttons and clickable rows show pointer; read-only panels and text do not.
- Palette is driven by central CSS variables and Tailwind tokens.
- There is no colored glow in shadows, hover states, focus states, or backgrounds.
- Existing order workflows and permission behavior remain unchanged.
