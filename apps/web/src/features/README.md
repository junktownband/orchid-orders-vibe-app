# Web Features

Feature folders keep page-level code out of the app shell so future tasks can read a narrow area.

## Folders

- `auth` - login screen.
- `dashboard` - main KPI screen and quick actions.
- `orders` - order list, card, issue flow, and order creation.
- `expenses` - expense register and expense creation.
- `analytics` - analytics page and master commission register.
- `settings` - profile, tax, audit, members, and service catalog settings.

## Rule

Do not add new screens to `app/App.tsx`. Add them to a feature folder and export through that folder index when needed.
