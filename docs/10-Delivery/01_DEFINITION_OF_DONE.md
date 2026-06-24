# Definition of Done

Фича считается готовой, если:

- есть backend endpoint;
- есть валидация DTO;
- есть проверка роли;
- все запросы scoped by organizationId;
- есть frontend UI;
- есть loading/empty/error states;
- деньги считаются на backend;
- важные действия пишутся в audit;
- есть тесты для бизнес-логики;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` проходят.

## Запрещенные компромиссы

- временно хранить данные в localStorage как source of truth;
- считать финальные KPI только на frontend;
- делать Google Sheets fallback;
- отправлять пользователя редактировать таблицу;
- использовать float для денег;
- пропускать organizationId в запросах;
- показывать мастеру чужие финансы.
