# Design System Notes

## Product Tone

Orchid Control is an internal operations tool for repair workshop work: orders, margins, expenses, and closing flows. The interface should feel calm, dense, and trustworthy rather than decorative or marketing-oriented.

## Visual Direction

- Background: dark neutral graphite with a subtle grid texture.
- Panels: compact `8px` radius, quiet border, restrained shadow, no decorative radial highlights.
- Accent colors:
  - `mint` for primary actions and positive cash/profit.
  - `amber` for warnings, drafts, and attention states.
  - `coral` for destructive or negative-margin states.
  - `orchid` is kept as a secondary data accent, not the dominant theme.
- Numeric values should use tabular figures for easier comparison.

## Component Rules

- Use `PrimaryButton` for one main action in a local area.
- Use `GhostButton` for secondary actions, back, edit, and low-risk controls.
- Icon-only buttons must have `aria-label`; icons inside labeled buttons should be decorative.
- Form controls should keep visible labels, a meaningful `name`, and sensible `autocomplete`.
- Cards should represent real repeated records or framed tools. Avoid nested card-on-card layouts unless a sub-item needs a clear editable boundary.

## Motion

- Screen transitions should be short and use opacity/transform only.
- Respect `prefers-reduced-motion`; Framer Motion screens use `useReducedMotion`.
- CSS includes a reduced-motion fallback for global animations and transitions.

## Accessibility Baseline

- Preserve semantic form labels.
- Use `focus-visible` for keyboard focus.
- Use `aria-live="polite"` for async validation or auth messages.
- Keep navigation labels visible on wider screens and keep aria labels on icon navigation.
- Do not disable browser zoom or paste.

## Reference

The UI audit cross-check used Vercel Web Interface Guidelines: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
