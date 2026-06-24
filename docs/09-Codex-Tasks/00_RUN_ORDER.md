# Run Order for Codex

Выполнять строго по этапам. Не пытаться сделать всё за один раз.

## Этапы

1. [[09-Codex-Tasks/01_STAGE_BOOTSTRAP_MONOREPO]]
2. [[09-Codex-Tasks/02_STAGE_DATABASE_PRISMA]]
3. [[09-Codex-Tasks/03_STAGE_AUTH_RBAC]]
4. [[09-Codex-Tasks/04_STAGE_SETTINGS_REFERENCE_DATA]]
5. [[09-Codex-Tasks/05_STAGE_REPAIR_ORDERS]]
6. [[09-Codex-Tasks/06_STAGE_PAYMENTS_COMMISSIONS]]
7. [[09-Codex-Tasks/07_STAGE_EXPENSES]]
8. [[09-Codex-Tasks/08_STAGE_ANALYTICS_DASHBOARD]]
9. [[09-Codex-Tasks/09_STAGE_FRONTEND_SHELL_DESIGN_SYSTEM]]
10. [[09-Codex-Tasks/10_STAGE_FRONTEND_FORMS_AND_SCREENS]]
11. [[09-Codex-Tasks/11_STAGE_AUDIT_AND_POLISH]]
12. [[09-Codex-Tasks/12_STAGE_TESTS_DEPLOYMENT]]

## Перед каждым этапом

Codex должен:

1. прочитать ТЗ этапа;
2. посмотреть текущую структуру проекта;
3. составить краткий план;
4. реализовать;
5. проверить команды;
6. обновить changelog.

## После каждого этапа

Минимальные проверки:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Если команда пока не настроена — настроить или явно зафиксировать почему она появится на следующем этапе.
