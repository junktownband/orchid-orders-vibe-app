# Web App Shell

Read this folder only for application shell work: auth session recovery, URL routing, bottom navigation, and provider setup.

## Files

- `App.tsx` - thin shell that wires auth, routing, navigation, and feature pages.
- `app-core.ts` - shared app helpers and types kept as a compatibility barrel for feature modules.
- `ui.tsx` - reusable UI primitives such as panels, fields, buttons, metric cards, and toolbar.

## Feature Entry Points

- Orders: `../features/orders`
- Expenses: `../features/expenses`
- Analytics: `../features/analytics`
- Settings: `../features/settings`
- Auth: `../features/auth`

For feature work, start in the feature folder. Avoid opening `App.tsx` unless the route, session, or shell layout changes.
