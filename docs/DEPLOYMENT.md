# Deployment Notes

Orchid Control is currently configured for local development with PostgreSQL installed locally or provided by an external PostgreSQL service.

Runtime processes can be managed by PM2 through `ecosystem.config.cjs` after `pnpm build`:

- `orchid-api` runs the Fastify API on `http://localhost:3005`.
- `orchid-web` previews the built Vite React app on `http://localhost:5173`.

For a public production host, prefer nginx static hosting for `apps/web/dist` with SPA fallback to `index.html`, and reverse proxy `/api` to the API process.

Required production env:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-at-least-32-random-characters
APP_URL=https://your-domain.example
```

If the frontend is not served from the same origin as the API, build it with `VITE_API_URL` pointing to the API origin.

No Google services, Google Sheets, Forms, Drive, Excel, or CSV storage are part of the runtime architecture.

## Production Seed

Run the default seed for production baseline data:

```bash
ORCHID_SEED_PASSWORD="replace-with-initial-password" pnpm db:seed
```

This creates only basic settings, reference rows, and the approved production users. Demo orders are not created unless `pnpm db:seed:demo` is used explicitly.
