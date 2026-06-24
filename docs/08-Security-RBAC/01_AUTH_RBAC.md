# Auth and RBAC

## Auth

MVP:

- email/password;
- password hash through bcrypt/argon2;
- short-lived access token;
- refresh token in an httpOnly cookie;
- `/auth/me` returns the current user, organization, and role.

## Current Roles

Production roles are:

- `OWNER`;
- `ADMIN`;
- `MANAGER`;
- `MASTER`.

The legacy read-only observer role is removed from the product role model and must not be offered by the API or UI.

## RBAC Matrix

| Action | OWNER | ADMIN | MANAGER | MASTER |
|---|---:|---:|---:|---:|
| Dashboard full | yes | yes | yes | no |
| Repair order list/detail | yes | yes | yes | yes |
| Create/edit repair order | yes | yes | yes | no |
| Change normal repair status | yes | yes | yes | limited |
| Add payment | yes | yes | yes | no |
| Void payment/correction | yes | yes | no | no |
| Create expense | yes | yes | yes | no |
| Confirm/void regular expense | yes | yes | yes | no |
| Service catalog read/use | yes | yes | yes | no |
| Service catalog manage | yes | yes | no | no |
| Settings read | yes | yes | limited | no |
| Tax mode changes | yes | no | no | no |
| Users/roles | yes | limited | no | no |
| Audit | yes | yes | yes | no |
| Master commission payouts | yes | yes | no | no |

## Data Scope

Every request must be scoped by the current membership `organizationId`.

Repair orders are transparent inside the organization: every active role can read order list and detail endpoints. `OWNER`, `ADMIN`, and `MANAGER` operate orders. `MASTER` can only move work through `IN_PROGRESS` and `READY`; masters cannot create, edit, cancel, issue, assign, or touch money, settings, payouts, expenses, catalog, or audit.

`MASTER`:

- can read organization repair orders;
- can set repair status to `IN_PROGRESS` or `READY`;
- cannot create/edit/cancel/issue orders or change assignees;
- cannot add, confirm, void, or correct money movements;
- cannot access back-office APIs such as dashboard, expenses, payouts, settings, catalog management, or audit.

## Audit

Audit log is required for:

- financial changes, including payments, expense confirmation, expense void, and payment void;
- repair order creation, status, issue, assignee, and item price/cost changes;
- role/member changes;
- settings changes;
- service catalog changes;
- commission payout marks;
- void/correction operations.
