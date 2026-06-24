# Package Scripts Draft

Root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "db:generate": "pnpm --filter @orchid/db prisma generate",
    "db:migrate": "pnpm --filter @orchid/db prisma migrate dev",
    "db:seed": "pnpm --filter @orchid/db prisma db seed",
    "db:seed:demo": "pnpm --filter @orchid/db prisma db seed -- --demo",
    "db:studio": "pnpm --filter @orchid/db prisma studio"
  }
}
```

Docker compose:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: orchid-control-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: orchid
      POSTGRES_PASSWORD: orchid
      POSTGRES_DB: orchid_control
    ports:
      - "5432:5432"
    volumes:
      - orchid_postgres_data:/var/lib/postgresql/data
volumes:
  orchid_postgres_data:
```
