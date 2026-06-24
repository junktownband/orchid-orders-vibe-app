# Deployment Notes

## Вариант 1: Ubuntu + PostgreSQL + pm2 + nginx

### Backend

- build TypeScript;
- запуск через pm2;
- API на `127.0.0.1:3005`;
- nginx reverse proxy `/api`.

### Frontend

- build Vite;
- nginx static hosting;
- SPA fallback на `index.html`.

### PostgreSQL

- слушает localhost;
- отдельный пользователь БД;
- регулярный backup через `pg_dump`.

## Backup

Минимальный cron:

```bash
pg_dump "$DATABASE_URL" | gzip > /backups/orchid-control-$(date +%F-%H%M).sql.gz
```

## Env production

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=long-random-secret
JWT_REFRESH_SECRET=long-random-secret
APP_URL=https://your-domain.ru
API_URL=https://your-domain.ru/api
```

## Важно

Не использовать Google Drive как backup. Бэкапы локальные или на выбранное владельцем хранилище вне приложения.
